// src/controllers/brandController.js
const { createSchema, updateSchema } = require('../validator/brandValidator');
const BrandService = require('../services/brandService');
const db = require('../models'); // asumsi index.js export semua model
const { Op, UniqueConstraintError, ValidationError } = require('sequelize'); // <- impor error classes

const brandService = new BrandService({ BrandModel: db.Brand });

const handleError = (res, err) => {
  console.error(err);
  // jangan bocorkan stack di production; kembalikan pesan singkat
  return res.status(500).json({ success: false, message: err.message || 'Terjadi kesalahan' });
};

module.exports = {
  createBrand: async (req, res) => {
    try {

      const payload = req.body;
      if (req.file) payload.logo = `/uploads/brands/${req.file.filename}`;

      // normalize kode server-side
      if (payload.kode) payload.kode = payload.kode.trim().toUpperCase();

      const brand = await brandService.create(payload);
      return res.status(201).json({ success: true, data: brand });
    } catch (err) {
      console.error('createBrand error:', err);

      // handle unique constraint
      if (err instanceof UniqueConstraintError || err.name === 'SequelizeUniqueConstraintError') {
        return res.status(422).json({ success: false, message: 'Kode brand sudah digunakan', errors: err.errors });
      }

      // handle validation errors
      if (err instanceof ValidationError || err.name === 'SequelizeValidationError') {
        const msgs = Array.isArray(err.errors) ? err.errors.map(e => e.message) : [err.message];
        return res.status(422).json({ success: false, message: 'Validasi gagal', errors: msgs });
      }

      return handleError(res, err);
    }
  },

  getBrands: async (req, res) => {
    try {
      const { page, limit, q } = req.query;
      const result = await brandService.findAll({
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        q
      });
      return res.json({ success: true, ...result });
    } catch (err) {
      return handleError(res, err);
    }
  },

  getBrand: async (req, res) => {
    try {
      const { id } = req.params;
      const brand = await brandService.findById(id);
      if (!brand) return res.status(404).json({ success: false, message: 'Brand tidak ditemukan' });
      return res.json({ success: true, data: brand });
    } catch (err) {
      return handleError(res, err);
    }
  },

  updateBrand: async (req, res) => {
    try {
      const payload = req.body;
      if (req.file) payload.logo = `/uploads/brands/${req.file.filename}`;
      if (payload.kode) payload.kode = payload.kode.trim().toUpperCase();

      const brand = await brandService.update(req.params.id, payload);
      return res.json({ success: true, data: brand });
    } catch (err) {
      console.error('updateBrand error:', err);

      if (err instanceof UniqueConstraintError || err.name === 'SequelizeUniqueConstraintError') {
        return res.status(422).json({ success: false, message: 'Kode brand sudah digunakan', errors: err.errors });
      }

      if (err instanceof ValidationError || err.name === 'SequelizeValidationError') {
        const msgs = Array.isArray(err.errors) ? err.errors.map(e => e.message) : [err.message];
        return res.status(422).json({ success: false, message: 'Validasi gagal', errors: msgs });
      }

      return handleError(res, err);
    }
  },

  deleteBrand: async (req, res) => {
    try {
      const { id } = req.params;
      await brandService.delete(id);
      return res.json({ success: true, message: 'Brand dihapus' });
    } catch (err) {
      return handleError(res, err);
    }
  },

  // ===== new endpoint: GET /api/brands/:id/items =====
  getItems: async (req, res) => {
    try {
      const brandIdRaw = req.params.id;
      const brandId = brandIdRaw ? brandIdRaw.toString() : null;
      if (!brandId) return res.status(400).json({ success: false, message: 'brand id tidak valid' });

      const Item = db.Item;
      const Brand = db.Brand;
      if (!Item) return res.status(500).json({ success: false, message: 'Model Item tidak ditemukan di server' });

      // try get brand record (to obtain brand.kode)
      const brand = await Brand ? await Brand.findByPk(brandId) : null;
      const brandKode = brand ? (brand.kode || brand.Kode || '').toString().trim() : null;

      // Detect if Item has brand FK column
      const rawAttrs = Item.rawAttributes || {};
      const hasBrandIdAttr = Object.prototype.hasOwnProperty.call(rawAttrs, 'brand_id') || Object.prototype.hasOwnProperty.call(rawAttrs, 'brandId');
      const brandIdAttrName = Object.prototype.hasOwnProperty.call(rawAttrs, 'brand_id') ? 'brand_id' : (Object.prototype.hasOwnProperty.call(rawAttrs, 'brandId') ? 'brandId' : null);

      // build where conditions (NOTE: no forced is_production)
      const where = {};

      // build OR clauses: either direct FK match OR code prefix match (prefix matching here)
      const orClauses = [];

      if (hasBrandIdAttr && brandIdAttrName) {
        const obj = {};
        obj[brandIdAttrName] = brandId;
        orClauses.push(obj);
      }

      if (brandKode) {
        // use prefix match by default to reduce false positives
        orClauses.push({ code: { [Op.like]: `${brandKode}.%` } });
      }

      if (orClauses.length > 0) {
        where[Op.or] = orClauses;
      } else {
        // cannot safely filter by brand -> return empty
        return res.json({ success: true, data: [] });
      }

      const items = await Item.findAll({
        where,
        order: [['name', 'ASC']],
        include: db.Uom ? [{ model: db.Uom, as: 'uom', required: false }] : []
      });

      return res.json({ success: true, data: items });
    } catch (err) {
      console.error('brandController.getItems error', err);
      return res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
  },

  // itemsForBrand: paged + search. Replace existing implementation with this.
  async itemsForBrand(req, res) {
    const brandId = req.params.brandId;
    const q = (req.query.q || '').trim();
    const page = parseInt(req.query.page || '1', 10) || 1;
    const limit = Math.min(parseInt(req.query.limit || '1000', 10) || 1000, 1000);
    const offset = (page - 1) * limit;
    const category = req.query.category ? Number(req.query.category) : null;
    const isProductionParam = typeof req.query.is_production !== 'undefined' ? req.query.is_production : undefined;

    try {
      const brand = await db.Brand.findByPk(brandId, { attributes: ['id','kode','nama'] });
      if (!brand) return res.status(404).json({ success: false, message: 'Brand tidak ditemukan' });

      const kodeRaw = (brand.kode || '').toString().trim();
      const kode = kodeRaw ? kodeRaw.toUpperCase() : null;

      const Item = db.Item;
      const rawAttrs = Item.rawAttributes || {};
      const hasBrandIdAttr = Object.prototype.hasOwnProperty.call(rawAttrs, 'brand_id') || Object.prototype.hasOwnProperty.call(rawAttrs, 'brandId');
      const brandIdAttrName = hasBrandIdAttr ? (Object.prototype.hasOwnProperty.call(rawAttrs, 'brand_id') ? 'brand_id' : 'brandId') : null;

      // base where: start empty (no forced is_production)
      let where = {};

      // apply explicit is_production filter only if frontend provided it
      if (typeof isProductionParam !== 'undefined') {
        const val = (String(isProductionParam) === '1' || String(isProductionParam).toLowerCase() === 'true');
        where.is_production = val ? { [Op.or]: [1, true] } : 0;
      }
      // apply category filter if provided
      if (category) {
        where.category_item_id = category;
      }

      if (hasBrandIdAttr && brandIdAttrName) {
        // prefer exact FK match
        where[brandIdAttrName] = brandId;
        if (q) {
          where[Op.and] = where[Op.and] || [];
          where[Op.and].push({
            [Op.or]: [
              { name: { [Op.like]: `%${q}%` } },
              { code: { [Op.like]: `%${q}%` } }
            ]
          });
        }
      } else if (kode) {
        // no FK -> use strict segment matching: SUBSTRING_INDEX(code, '.', 1) = kode
        // Use Sequelize.fn and Sequelize.where for safer DB-level function usage
        const { fn, col, where: seqWhere } = db.Sequelize;
        // ensure uppercase comparison of left segment
        where[Op.and] = where[Op.and] || [];
        where[Op.and].push(seqWhere(fn('UPPER', fn('SUBSTRING_INDEX', col('code'), '.', 1)), kode));
        if (q) {
          where[Op.and].push({
            [Op.or]: [
              { name: { [Op.like]: `%${q}%` } },
              { code: { [Op.like]: `%${q}%` } }
            ]
          });
        }
      } else {
        // cannot determine brand -> return empty paged result
        return res.json({ success: true, data: [], meta: { total: 0, page: 1, limit } });
      }

      // Query DB with pagination
      const { rows, count } = await db.Item.findAndCountAll({
        where,
        attributes: ['id','name','code','description','uom_id','category_item_id','is_production'],
        order: [['name','ASC']],
        limit,
        offset
      });

      return res.json({
        success: true,
        data: rows,
        meta: { total: count, page, limit, pages: Math.ceil(count / limit) }
      });
    } catch (err) {
      console.error('itemsForBrand error', err);
      return res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
  }


};
