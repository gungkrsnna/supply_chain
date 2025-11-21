// services/itemService.js
const models = require("../models");
const { Op } = require("sequelize");

const { sequelize } = models; // if needed

const { Item, ItemMeasurement, Uom, CategoryItem, Brand } = models;

// helper: pad number (3 digits)
const pad = (n) => String(n).padStart(3, "0");

module.exports = {
  /**
   * Generate next code for a brand + category + optional codePrefix
   * - brandKode: required
   * - categoryKode: optional (but recommended)
   * - options.codePrefix: optional
   *
   * Example: brandKode="RG", categoryKode="FG", codePrefix="SR.16" ->
   * likePattern = "RG.FG.SR.16.%"
   */
  async generateCodeForBrand(brandKode, categoryKode, options = {}) {
    if (!brandKode) throw new Error("brandKode required to generate code");
    if (!categoryKode) throw new Error("categoryKode required to generate code"); // jangan biarkan kosong

    const clean = s => String(s).trim().replace(/(^\.*|\.*$)/g, '');
    const parts = [ clean(brandKode), clean(categoryKode) ]; // <-- WAJIB masuk
    if (options.codePrefix) parts.push(clean(options.codePrefix)); // opsional: 'SR.16'

    const prefix = parts.join('.');
    const likePattern = `${prefix}.%`;   // contoh: RG.FG.SR.16.%

    // fetch codes that start with prefix
    const rows = await Item.findAll({
      where: { code: { [Op.like]: likePattern } },
      attributes: ["code"]
    });

    // extract last numeric group from each code, find max
    const trailingRe = /(\d+)\s*$/;
    let maxNum = 0;
    (rows || []).forEach(r => {
      const c = String(r.code || "");
      const m = c.match(trailingRe);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!Number.isNaN(n) && n > maxNum) maxNum = n;
      }
    });

    let next = maxNum + 1;
    // assemble candidate: prefix + '.' + padded number
    const candidate = `${prefix}.${pad(next)}`;
    // if unique, return; otherwise find next available by scanning upward
    const exists = await Item.findOne({ where: { code: candidate } });
    if (!exists) return candidate;

    let attempt = next + 1;
    for (;;) {
      const cand = `${prefix}.${pad(attempt)}`;
      const ex = await Item.findOne({ where: { code: cand } });
      if (!ex) return cand;
      attempt++;
    }
  },

  // create item + measurement units (with code generation fallback)
  async createItem(data) {
    // We'll not use a long-lived transaction across code generation + create
    // Instead we'll attempt create in a short transaction and retry on unique conflict.
    const measurementUnits = data.measurement_units ?? [];
    const payload = { ...data };
    delete payload.measurement_units;

    // prefer code if provided
    if (payload.code) {
      // simple create with transaction
      const t = await sequelize.transaction();
      try {
        const item = await Item.create(payload, { transaction: t });

        if (Array.isArray(measurementUnits) && measurementUnits.length > 0) {
          const rows = measurementUnits.map(mu => ({
            item_id: item.id,
            uom_id: mu.uom_id,
            value: mu.value,
            value_in_grams: mu.value_in_grams ?? mu.value,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          await ItemMeasurement.bulkCreate(rows, { transaction: t });
        }

        await t.commit();
        return await this.getItemById(item.id);
      } catch (err) {
        await t.rollback();
        throw err;
      }
    }

    // If code not provided -> generate using brandKode or brand_id + category_item_id
    // Resolve brandKode
    // ---------- replace resolve brand & category in createItem ----------
    // Resolve brandKode (force using DB column 'kode')
    let brandKode = payload.brandKode;
    if (!brandKode && payload.brand_id) {
      try {
        // Ambil hanya kolom 'kode' (pastikan model Brand punya kolom 'kode')
        const brandRec = await Brand.findByPk(payload.brand_id, { attributes: ['kode'] });
        if (brandRec && brandRec.kode) {
          brandKode = brandRec.kode;
        } else {
          // jika kolom 'kode' tidak ada atau null, beri pesan jelas
          throw new Error(`Brand with id=${payload.brand_id} does not have a 'kode' value`);
        }
      } catch (err) {
        console.warn("Warning resolving brand by id:", err);
      }
    }

    // Resolve categoryKode from CategoryItem.kod e (force using DB column 'kode')
    // === resolve categoryKode (WAJIB ada) ===
    let categoryKode = undefined;
    if (payload.category_item_id) {
      const cat = await CategoryItem.findByPk(payload.category_item_id, { attributes: ['kode'] });
      if (cat && cat.kode) {
        categoryKode = cat.kode; // contoh: 'FG', 'SFG', 'RM'
      }
    }
    if (!categoryKode) {
      throw new Error(`CategoryItem ${payload.category_item_id} tidak punya kolom 'kode'. Isi dulu di DB atau pastikan nama kolomnya benar.`);
    }


    if (!brandKode) {
      throw new Error("brandKode is required when code is not provided. Resolve brand_id to a Brand record that has a 'kode' column/value.");
    }


    // try creating with generated codes, retry if unique conflict occurs
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // generate candidate code each attempt (generateCodeForBrand scans DB for last)
      const candidateCode = await this.generateCodeForBrand(
        brandKode,
        categoryKode,
        { codePrefix: payload.codePrefix } // kalau kamu pakai SR.16 dsb
      );


      // set code in payload
      const toCreate = { ...payload, code: candidateCode };

      const t = await sequelize.transaction();
      try {
        const item = await Item.create(toCreate, { transaction: t });

        if (Array.isArray(measurementUnits) && measurementUnits.length > 0) {
          const rows = measurementUnits.map(mu => ({
            item_id: item.id,
            uom_id: mu.uom_id,
            value: mu.value,
            value_in_grams: mu.value_in_grams ?? mu.value,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          await ItemMeasurement.bulkCreate(rows, { transaction: t });
        }

        await t.commit();
        return await this.getItemById(item.id);
      } catch (err) {
        await t.rollback();
        // check unique constraint on code - message may vary by DB/dialect
        const msg = (err && err.message || "").toLowerCase();
        if (msg.includes("unique") || msg.includes("duplicate") || (err.name && err.name.toLowerCase().includes("unique"))) {
          // conflict - another process created same code concurrently; retry
          if (attempt === maxAttempts - 1) {
            throw new Error("Failed to create item due to repeated code conflicts");
          }
          // wait a tiny bit (optional) or continue immediately
          continue;
        }
        // other errors -> rethrow
        throw err;
      }
    }

    throw new Error("Failed to create item");
  },

  // update item + replace measurement units when provided
  async updateItem(id, data) {
    const t = await sequelize.transaction();
    try {
      const item = await Item.findByPk(id, { transaction: t });
      if (!item) {
        await t.rollback();
        return null;
      }

      const measurementUnits = data.measurement_units ?? undefined;
      const itemPayload = { ...data };
      delete itemPayload.measurement_units;

      await item.update(itemPayload, { transaction: t });

      if (measurementUnits !== undefined) {
        // remove existing and insert new
        await ItemMeasurement.destroy({ where: { item_id: id }, transaction: t });
        if (Array.isArray(measurementUnits) && measurementUnits.length > 0) {
          const rows = measurementUnits.map(mu => ({
            item_id: id,
            uom_id: mu.uom_id,
            value: mu.value,
            value_in_grams: mu.value_in_grams ?? mu.value,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          await ItemMeasurement.bulkCreate(rows, { transaction: t });
        }
      }

      await t.commit();
      return await this.getItemById(id);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // get single item with associations including measurements
  async getItemById(id) {
    return await Item.findOne({
      where: { id },
      include: [
        { model: CategoryItem, as: "category_item" },
        { model: Uom, as: "uom" },
        {
          model: ItemMeasurement,
          as: "measurements",
          include: [{ model: Uom, as: "uom" }]
        }
      ]
    });
  },

  // list items (kept simple)
  async getAllItems(opts = {}) {
    const where = {};
    if (opts.is_production !== undefined) {
      where.is_production = opts.is_production ? { [Op.or]: [1, true] } : 0;
    }

    const or = [];
    if (opts.brandId) {
      if (Object.prototype.hasOwnProperty.call(Item.rawAttributes, 'brand_id')) {
        or.push({ brand_id: opts.brandId });
      } else if (Object.prototype.hasOwnProperty.call(Item.rawAttributes, 'brandId')) {
        or.push({ brandId: opts.brandId });
      }
    }
    if (opts.brandKode) {
      or.push({ code: { [Op.like]: `${opts.brandKode}.%` } });
    }
    if (opts.q) {
      where[Op.or] = where[Op.or] || [];
      where[Op.or].push(
        { name: { [Op.like]: `%${opts.q}%` } },
        { code: { [Op.like]: `%${opts.q}%` } }
      );
    }
    if (or.length) where[Op.or] = or;

    return await Item.findAll({
      where,
      order: [['name','ASC']],
      limit: opts.limit || 1000,
      include: [
        {
          model: ItemMeasurement,
          as: 'measurements',
          include: [{ model: Uom, as: 'uom' }]
        }
      ]
    });
  },

  // services/itemService.js (di dalam module.exports)
  async findItemsByCodePrefix(brandKode, options = {}) {
    const { q, is_production, limit = 200 } = options;
    const where = {};

    // normalize is_production to boolean | undefined
    if (is_production !== undefined && is_production !== null && String(is_production) !== "") {
      const s = String(is_production).toLowerCase();
      if (s === "1" || s === "true" || s === "yes") where.is_production = true;
      else if (s === "0" || s === "false" || s === "no") where.is_production = false;
      // else leave undefined (no filter)
    }

    // code prefix search
    where.code = { [Op.like]: `${brandKode}.%` };

    if (q && q.trim()) {
      const dialect = models.sequelize.getDialect();
      const likeOp = dialect === "postgres" ? Op.iLike : Op.like;
      const pattern = `%${q}%`;
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { name: { [likeOp]: pattern } },
          { code: { [likeOp]: pattern } }
        ]
      });
    }

    return await models.Item.findAll({
      where,
      limit: Math.min(limit, 1000),
      order: [['name', 'ASC']],
      include: [
        { model: models.ItemMeasurement, as: 'measurements', include: [{ model: models.Uom, as: 'uom' }] },
        { model: models.CategoryItem, as: 'category_item' }
      ]
    });
  },


  /**
   * Find items by brand name fragment (e.g. 'roti goolung' -> search code/name)
   * Usage: await itemService.findItemsByBrandNameFragment('roti goolung', { q: 'tepung' });
   */
  async findItemsByBrandNameFragment(brandName, options = {}) {
    const { q, is_production, limit = 200 } = options;
    const where = {};
    if (is_production !== undefined && is_production !== null && String(is_production) !== "") {
      const v = String(is_production).toLowerCase();
      where.is_production = (v === "1" || v === "true" || v === "yes") ? 1 : 0;
    }

    const dialect = models.sequelize.getDialect();
    const likeOp = dialect === "postgres" ? Op.iLike : Op.like;
    const brandPattern = `%${brandName}%`;

    where[Op.or] = [
      { name: { [likeOp]: brandPattern } },
      { code: { [likeOp]: brandPattern } }
    ];

    if (q && q.trim()) {
      const patternQ = `%${q}%`;
      where[Op.and] = where[Op.and] || [];
      where[Op.and].push({
        [Op.or]: [
          { name: { [likeOp]: patternQ } },
          { code: { [likeOp]: patternQ } }
        ]
      });
    }

    return await Item.findAll({
      where,
      limit: Math.min(limit, 1000),
      order: [['name', 'ASC']],
      include: [
        { model: ItemMeasurement, as: 'measurements', include: [{ model: Uom, as: 'uom' }] },
        { model: CategoryItem, as: 'category_item' }
      ]
    });
  },

  /**
   * Find items by tokens derived from store name (split name into words and search)
   * Usage: await itemService.findItemsByBrandTokens(['Roti','Goolung'], { q:'tepung' });
   */
  async findItemsByBrandTokens(tokens = [], options = {}) {
    const { q, is_production, limit = 200 } = options;
    const where = {};
    if (is_production !== undefined && is_production !== null && String(is_production) !== "") {
      const v = String(is_production).toLowerCase();
      where.is_production = (v === "1" || v === "true" || v === "yes") ? 1 : 0;
    }

    const dialect = models.sequelize.getDialect();
    const likeOp = dialect === "postgres" ? Op.iLike : Op.like;

    const orClauses = [];
    for (const t of tokens.slice(0, 4)) { // limit token count
      const p = `%${t}%`;
      orClauses.push({ name: { [likeOp]: p } });
      orClauses.push({ code: { [likeOp]: p } });
    }

    if (orClauses.length === 0) return [];

    where[Op.or] = orClauses;

    if (q && q.trim()) {
      const patternQ = `%${q}%`;
      where[Op.and] = [{
        [Op.or]: [
          { name: { [likeOp]: patternQ } },
          { code: { [likeOp]: patternQ } }
        ]
      }];
    }

    return await Item.findAll({
      where,
      limit: Math.min(limit, 1000),
      order: [['name','ASC']],
      include: [
        { model: ItemMeasurement, as: 'measurements', include: [{ model: Uom, as: 'uom' }] },
        { model: CategoryItem, as: 'category_item' }
      ]
    });
  },


  // delete
  async deleteItem(id) {
    const item = await Item.findByPk(id);
    if (!item) return null;
    await item.destroy();
    return true;
  }
};
