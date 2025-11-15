// src/services/inventoryService.js
const { sequelize, ItemMeasurement, StoreItem, StoreItemTransaction, Item, Uom } = require("../models");

const TRANSACTION_TYPES = {
  IN: "IN",
  OUT: "OUT",
  TRANSFER_IN: "TRANSFER_IN",
  TRANSFER_OUT: "TRANSFER_OUT",
  PRODUCTION_USE: "PRODUCTION_USE",
  LEFTOVER_RETURN: "LEFTOVER_RETURN",
  ADJUSTMENT: "ADJUSTMENT"
};

module.exports = {
  TRANSACTION_TYPES,

  /**
   * recordTransaction options:
   * - storeId (int, required)
   * - itemId (int, required)
   * - measurementId (int|null) -> if provided, quantity means "count of measurement" (e.g. 3 pcs)
   * - quantity (number, required) -> if measurementId == null, quantity is in base unit (grams)
   * - type (string, required)
   * - reference, note, allowNegative, actorId
   */
  async recordTransaction({
    storeId,
    itemId,
    measurementId = null,
    quantity = null,
    measurementEntries = null,
    customGrams = null,
    type,
    reference = null,
    note = null,
    allowNegative = false,
    actorId = null,
    setAbsolute = false
  }) {
    if (!storeId || !itemId || !type) {
      throw new Error("Missing required params for recordTransaction (storeId, itemId, type)");
    }

    const hasLegacyQty = (quantity !== undefined && quantity !== null);
    const hasEntries = Array.isArray(measurementEntries) && measurementEntries.length > 0;
    const hasCustom = (customGrams !== undefined && customGrams !== null);

    if (!hasLegacyQty && !hasEntries && !hasCustom) {
      throw new Error("Missing quantity information: provide quantity OR measurementEntries OR customGrams");
    }

    // inside recordTransaction - replace transaction body with this
      return await sequelize.transaction(async (tx) => {
        // compute convertedQty (same as before) ...
        let convertedQty = 0;
        let breakdown = null;

        // --- compute convertedQty (same code you already have) ---
        if (hasEntries) {
          breakdown = { measurementEntries: [], customGrams: Number(customGrams || 0) };
          for (const e of measurementEntries) {
            const mId = Number(e.measurementId);
            const cnt = Number(e.count);
            if (!mId || Number.isNaN(cnt)) {
              throw new Error("Invalid measurementEntries (measurementId and count required)");
            }
            const meas = await ItemMeasurement.findByPk(mId, { transaction: tx });
            if (!meas) throw new Error(`Measurement id ${mId} not found`);
            const gramsPer = Number(meas.value_in_grams ?? meas.value ?? 0);
            if (!gramsPer || Number.isNaN(gramsPer)) {
              throw new Error(`Measurement id ${mId} missing conversion value (value_in_grams/value)`);
            }
            const add = gramsPer * cnt;
            convertedQty += add;
            breakdown.measurementEntries.push({ measurementId: mId, count: cnt, gramsPer, subtotal: add });
          }
          if (hasCustom) convertedQty += Number(customGrams);
        } else if (hasLegacyQty) {
          if (measurementId) {
            const meas = await ItemMeasurement.findByPk(Number(measurementId), { transaction: tx });
            if (!meas) throw new Error("Measurement not found");
            const gramsPer = Number(meas.value_in_grams ?? meas.value ?? 0);
            if (!gramsPer || Number.isNaN(gramsPer)) throw new Error("Measurement missing conversion value");
            convertedQty = gramsPer * Number(quantity);
            breakdown = { measurementEntries: [{ measurementId: Number(measurementId), count: Number(quantity), gramsPer, subtotal: convertedQty }], customGrams: 0 };
          } else {
            convertedQty = Number(quantity);
            breakdown = { measurementEntries: [], customGrams: convertedQty };
          }
        } else if (hasCustom) {
          convertedQty = Number(customGrams);
          breakdown = { measurementEntries: [], customGrams: convertedQty };
        }
        // --- end compute convertedQty ---

        // ensure we have storeItem (lock) before creating ledger so we can validate for OUT
        let storeItem = await StoreItem.findOne({
          where: { store_id: storeId, item_id: itemId },
          transaction: tx,
          lock: tx.LOCK.UPDATE
        });

        if (!storeItem) {
          // create with 0 stock (locked)
          storeItem = await StoreItem.create({ store_id: storeId, item_id: itemId, stock: 0 }, { transaction: tx });
        }

        // explicit validation for OUT (friendly error message)
        if ([TRANSACTION_TYPES.OUT, TRANSACTION_TYPES.TRANSFER_OUT, TRANSACTION_TYPES.PRODUCTION_USE].includes(type)) {
          if (!allowNegative && (Number(convertedQty) > Number(storeItem.stock))) {
            throw new Error(`Insufficient stock: only ${Number(storeItem.stock)} g available, requested ${Number(convertedQty)} g`);
          }
        }

        // decide ledgerQuantity (same as before)
        let ledgerQuantity = null;
        if (breakdown && Array.isArray(breakdown.measurementEntries) && breakdown.measurementEntries.length === 1) {
          ledgerQuantity = Number(breakdown.measurementEntries[0].count);
        } else if (!hasEntries && hasLegacyQty && !measurementId) {
          ledgerQuantity = Number(quantity);
        } else {
          ledgerQuantity = null;
        }

        // create ledger row
        const ledger = await StoreItemTransaction.create({
          store_id: storeId,
          item_id: itemId,
          measurement_id: (breakdown && Array.isArray(breakdown.measurementEntries) && breakdown.measurementEntries.length === 1)
            ? breakdown.measurementEntries[0].measurementId
            : (measurementId || null),
          type,
          quantity: ledgerQuantity,
          converted_qty: convertedQty,
          reference,
          note,
          measurement_breakdown: breakdown,
          created_by: actorId ?? null
        }, { transaction: tx });

        // update storeItem.stock
        const positiveTypes = [TRANSACTION_TYPES.IN, TRANSACTION_TYPES.TRANSFER_IN, TRANSACTION_TYPES.LEFTOVER_RETURN];
        const delta = (positiveTypes.includes(type) ? 1 : -1) * Number(convertedQty);
        const newStock = Number(storeItem.stock) + delta;

        if (newStock < 0 && !allowNegative) {
          throw new Error("Insufficient stock");
        }

        storeItem.stock = newStock;
        await storeItem.save({ transaction: tx });

        return { ledger, storeItem };
      });

  },

  /**
   * Return store_items simple list (paged) — includes basic Item (but not measurements).
   */
  async getStoreInventory(storeId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const rows = await StoreItem.findAll({
      where: { store_id: storeId },
      include: [{ model: Item, as: "Item", required: false }],
      offset,
      limit,
      order: [["id", "ASC"]]
    });

    return rows.map(r => ({
      storeId,
      itemId: r.item_id,
      stock: Number(r.stock),
      Item: r.Item ? r.Item.get({ plain: true }) : null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  },

  /**
   * Return store inventory with item and item.measurements & uom included.
   */
  async getStoreInventoryWithItem(storeId) {
    const rows = await StoreItem.findAll({
      where: { store_id: storeId },
      include: [
        {
          model: Item,
          as: "Item",
          include: [
            {
              model: ItemMeasurement,
              as: "measurements",
              include: [{ model: Uom, as: "uom" }]
            }
          ]
        }
      ],
      order: [["id", "ASC"]]
    });

    return rows.map(r => {
      const itemObj = r.Item ? r.Item.get({ plain: true }) : null;
      // Normalize measurements shape if present
      const measurements = itemObj?.measurements ? itemObj.measurements.map(m => ({
        id: m.id,
        uom: m.uom ? { id: m.uom.id, name: m.uom.name } : null,
        value: Number(m.value ?? m.value_in_grams ?? 1)
      })) : null;

      return {
        storeId,
        itemId: r.item_id,
        stock: Number(r.stock),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        Item: itemObj ? {
          id: itemObj.id,
          code: itemObj.code,
          name: itemObj.name,
          is_production: itemObj.is_production,
          measurements // simplified measurement list for frontend
        } : null
      };
    });
  },

  /**
   * Rebuild store_item.stock from ledger rows for single item
   */
  async rebuildStoreStockFromTransactions(storeId, itemId) {
    return await sequelize.transaction(async (tx) => {
      const transactions = await StoreItemTransaction.findAll({
        where: { store_id: storeId, item_id: itemId },
        transaction: tx,
        order: [["createdAt", "ASC"]]
      });

      let net = 0;
      for (const s of transactions) {
        const tType = s.type;
        const conv = Number(s.converted_qty ?? 0);
        if ([TRANSACTION_TYPES.IN, TRANSACTION_TYPES.TRANSFER_IN, TRANSACTION_TYPES.LEFTOVER_RETURN, TRANSACTION_TYPES.PRODUCTION_IN].includes(tType)) net += conv;
        else net -= conv;
      }

      const [si] = await StoreItem.findOrCreate({ where: { store_id: storeId, item_id: itemId }, defaults: { stock: 0 }, transaction: tx });
      si.stock = net;
      await si.save({ transaction: tx });
      return si;
    });
  },

  /**
   * Admin: set absolute stock (creates ADJUSTMENT ledger with diff)
   */
  async setAbsoluteStock({ storeId, itemId, absoluteStock, reason = null, actorId = null }) {
    if (typeof absoluteStock !== "number") throw new Error("absoluteStock must be a number");
    return await sequelize.transaction(async (tx) => {
      let storeItem = await StoreItem.findOne({ where: { store_id: storeId, item_id: itemId }, transaction: tx, lock: tx.LOCK.UPDATE });
      if (!storeItem) {
        storeItem = await StoreItem.create({ store_id: storeId, item_id: itemId, stock: 0 }, { transaction: tx });
      }
      const current = Number(storeItem.stock);
      const diff = Number(absoluteStock) - current;
      if (diff === 0) return { storeItem, adjustment: null };

      const type = TRANSACTION_TYPES.ADJUSTMENT;
      const quantity = Math.abs(diff);
      const convertedQty = Math.abs(diff);

      const ledger = await StoreItemTransaction.create({
        store_id: storeId,
        item_id: itemId,
        measurement_id: null,
        type,
        quantity,
        converted_qty: convertedQty,
        reference: "setAbsoluteStock",
        note: reason || `Set absolute stock from ${current} -> ${absoluteStock}`,
        created_by: actorId ?? null
      }, { transaction: tx });

      storeItem.stock = Number(absoluteStock);
      await storeItem.save({ transaction: tx });

      return { storeItem, adjustment: ledger };
    });
  },

  /**
   * Get single store item (current stock + basic Item)
   */
  async getStoreItem(storeId, itemId) {
    const si = await StoreItem.findOne({
      where: { store_id: storeId, item_id: itemId },
      include: [{ model: Item, as: "Item", required: false }]
    });
    if (!si) return null;
    return {
      storeId,
      itemId: si.item_id,
      stock: Number(si.stock),
      Item: si.Item ? si.Item.get({ plain: true }) : null,
      createdAt: si.createdAt,
      updatedAt: si.updatedAt
    };
  },

};
