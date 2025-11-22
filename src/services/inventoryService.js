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
  // paste menggantikan async recordTransaction({ ... }) { ... } di file src/services/inventoryService.js

// replace your current function with this recommended version
// replace existing async recordTransaction({...}) with this full implementation
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
  setAbsolute = false,
  from_store_id = null,
  to_store_id = null,
  _skipTransferSplit = false
}) {
  if (!storeId || !itemId || !type) {
    throw new Error("Missing required params for recordTransaction (storeId, itemId, type)");
  }

  // keep original for trace
  const originalType = String(type ?? "");
  const originalTypeUpper = originalType.toUpperCase();

  // canonical processing token
  let normType = originalTypeUpper;
  if (normType === "TRANSFER_OUT") normType = "OUT";
  if (normType === "TRANSFER_IN")  normType = "IN";

  // validate supported canonical tokens (TRANSFER handled specially)
  const ALLOWED_CANONICAL = ["IN", "OUT", "ADJUSTMENT", "TRANSFER"];
  if (!ALLOWED_CANONICAL.includes(normType)) {
    throw new Error(`Unsupported transaction type: ${originalType}`);
  }

  // helper to pick conversion value
  const pickConversionValue = (measRow) => {
    return Number(measRow.value_in_base ?? measRow.value_in_smallest ?? measRow.value_in_grams ?? measRow.value ?? 0);
  };

  const hasLegacyQty = (quantity !== undefined && quantity !== null);
  const hasEntries = Array.isArray(measurementEntries) && measurementEntries.length > 0;
  const hasCustom = (customGrams !== undefined && customGrams !== null);

  if (!hasLegacyQty && !hasEntries && !hasCustom) {
    throw new Error("Missing quantity information: provide quantity OR measurementEntries OR customGrams");
  }

  // compute convertedQty and breakdown (same logic as before)
  const computeConvertedAndBreakdown = async () => {
    let convertedQty = 0;
    let breakdown = null;

    if (hasCustom) {
      convertedQty = Number(customGrams) || 0;
      if (hasEntries) {
        breakdown = { measurementEntries: [], customGrams: Number(customGrams) };
        const ids = measurementEntries.map(e => Number(e.measurementId ?? e.measurement_id)).filter(id => id && !Number.isNaN(id));
        if (ids.length > 0) {
          const rows = await ItemMeasurement.findAll({ where: { id: ids } });
          const map = {};
          rows.forEach(r => { map[r.id] = pickConversionValue(r); });
          for (const e of measurementEntries) {
            const mId = Number(e.measurementId ?? e.measurement_id);
            const cnt = Number(e.count ?? e.qty ?? e.quantity ?? 0);
            const per = map[mId] ?? 0;
            const subtotal = (per && cnt) ? per * cnt : 0;
            breakdown.measurementEntries.push({ measurementId: mId, count: cnt, conversionPer: per, subtotal });
          }
        } else {
          breakdown.measurementEntries = measurementEntries.map(e => ({ measurementId: Number(e.measurementId ?? e.measurement_id), count: Number(e.count ?? e.qty ?? 0) }));
        }
      } else {
        breakdown = { measurementEntries: [], customGrams: Number(customGrams) };
      }
    } else {
      if (hasEntries) {
        breakdown = { measurementEntries: [], customGrams: 0 };
        for (const e of measurementEntries) {
          const mId = Number(e.measurementId ?? e.measurement_id);
          const cnt = Number(e.count ?? e.qty ?? e.quantity ?? 0);
          if (!mId || Number.isNaN(cnt)) throw new Error("Invalid measurementEntries (measurementId and count required)");
          const meas = await ItemMeasurement.findByPk(mId);
          if (!meas) throw new Error(`Measurement id ${mId} not found`);
          const conv = pickConversionValue(meas);
          if (!conv || Number.isNaN(conv)) throw new Error(`Measurement id ${mId} missing conversion value`);
          const add = conv * cnt;
          convertedQty += add;
          breakdown.measurementEntries.push({ measurementId: mId, count: cnt, conversionPer: conv, subtotal: add });
        }
      } else if (hasLegacyQty) {
        if (measurementId) {
          const meas = await ItemMeasurement.findByPk(Number(measurementId));
          if (!meas) throw new Error("Measurement not found");
          const conv = pickConversionValue(meas);
          if (!conv || Number.isNaN(conv)) throw new Error("Measurement missing conversion value");
          convertedQty = conv * Number(quantity);
          breakdown = { measurementEntries: [{ measurementId: Number(measurementId), count: Number(quantity), conversionPer: conv, subtotal: convertedQty }], customGrams: 0 };
        } else {
          convertedQty = Number(quantity);
          breakdown = { measurementEntries: [], customGrams: convertedQty };
        }
      } else {
        convertedQty = Number(customGrams || 0);
        breakdown = { measurementEntries: [], customGrams: convertedQty };
      }
    }

    return { convertedQty, breakdown };
  };

  // Run inside a DB transaction
  return await sequelize.transaction(async (tx) => {
    const item = await Item.findByPk(itemId, { transaction: tx, include: [{ model: Uom, as: "uom" }] });
    if (!item) throw new Error("Item not found");

    // compute converted & breakdown (we allowed ItemMeasurement.* queries inside compute)
    const { convertedQty, breakdown } = await computeConvertedAndBreakdown();

    // helper: determine legacy ledger quantity for human-facing quantity field
    let ledgerQuantity = null;
    if (breakdown && Array.isArray(breakdown.measurementEntries) && breakdown.measurementEntries.length === 1) {
      ledgerQuantity = Number(breakdown.measurementEntries[0].count);
    } else if (!hasEntries && hasLegacyQty && !measurementId) {
      ledgerQuantity = Number(quantity);
    }

    // Normalized processing token
    // (keep normType from earlier but ensure casing)
    normType = String(normType).toUpperCase();

    // Map canonical to DB enum ('in'|'out'|'adjustment')
    const dbTypeMap = { IN: "in", OUT: "out", ADJUSTMENT: "adjustment" };
    // NOTE: TRANSFER is special -> will be split into OUT + IN below
    const isTransfer = (normType === "TRANSFER");

    // If it's explicit TRANSFER (move between stores) -> do split here *atomically*
    if (isTransfer) {
      if (!from_store_id || !to_store_id) throw new Error("Transfer requires from_store_id and to_store_id");

      // lock both store items (source and destination)
      let srcStoreItem = await StoreItem.findOne({ where: { store_id: from_store_id, item_id: itemId }, transaction: tx, lock: tx.LOCK.UPDATE });
      if (!srcStoreItem) srcStoreItem = await StoreItem.create({ store_id: from_store_id, item_id: itemId, stock: 0 }, { transaction: tx });

      let dstStoreItem = await StoreItem.findOne({ where: { store_id: to_store_id, item_id: itemId }, transaction: tx, lock: tx.LOCK.UPDATE });
      if (!dstStoreItem) dstStoreItem = await StoreItem.create({ store_id: to_store_id, item_id: itemId, stock: 0 }, { transaction: tx });

      // validate source stock for OUT
      if (!allowNegative && Number(convertedQty) > Number(srcStoreItem.stock)) {
        throw new Error(`Insufficient stock on source store: only ${Number(srcStoreItem.stock)} available, requested ${Number(convertedQty)}`);
      }

      const unitLabel = item.base_uom_label ?? (item.uom ? item.uom.name : null) ?? "base unit";

      // create OUT ledger on source
      console.log("DBG creating TRANSFER OUT ledger (atomic split)", { from_store_id, to_store_id, convertedQty, originalTypeUpper });
      const outLedger = await StoreItemTransaction.create({
        store_id: from_store_id,
        item_id: itemId,
        measurement_id: (breakdown && Array.isArray(breakdown.measurementEntries) && breakdown.measurementEntries.length === 1)
          ? breakdown.measurementEntries[0].measurementId
          : (measurementId || null),
        type: dbTypeMap.OUT,
        transaction_type: originalTypeUpper,
        quantity: ledgerQuantity,
        converted_qty: Number(convertedQty),
        reference,
        note: note ?? `Transfer to store ${to_store_id}`,
        measurement_breakdown: breakdown,
        created_by: actorId ?? null,
        from_store_id: from_store_id,
        to_store_id: to_store_id,
        is_in: false
      }, { transaction: tx });

      // deduct source stock
      srcStoreItem.stock = Number(srcStoreItem.stock) - Number(convertedQty);
      if (srcStoreItem.stock < 0 && !allowNegative) throw new Error("Insufficient stock after deduction");
      await srcStoreItem.save({ transaction: tx });

      // create IN ledger on destination
      console.log("DBG creating TRANSFER IN ledger (atomic split)", { from_store_id, to_store_id, convertedQty, originalTypeUpper });
      const inLedger = await StoreItemTransaction.create({
        store_id: to_store_id,
        item_id: itemId,
        measurement_id: (breakdown && Array.isArray(breakdown.measurementEntries) && breakdown.measurementEntries.length === 1)
          ? breakdown.measurementEntries[0].measurementId
          : (measurementId || null),
        type: dbTypeMap.IN,
        transaction_type: originalTypeUpper,
        quantity: ledgerQuantity,
        converted_qty: Number(convertedQty),
        reference,
        note: note ?? `Transfer from store ${from_store_id}`,
        measurement_breakdown: breakdown,
        created_by: actorId ?? null,
        from_store_id: from_store_id,
        to_store_id: to_store_id,
        is_in: true
      }, { transaction: tx });

      // increase dest stock
      dstStoreItem.stock = Number(dstStoreItem.stock) + Number(convertedQty);
      await dstStoreItem.save({ transaction: tx });

      // return both ledgers + storeItem snapshots
      return { ledger: { out: outLedger, in: inLedger }, storeItem: { from: srcStoreItem, to: dstStoreItem } };
    }

    // ---- Single-store flow (IN / OUT / ADJUSTMENT) ----
    // lock/get storeItem
    let storeItem = await StoreItem.findOne({ where: { store_id: storeId, item_id: itemId }, transaction: tx, lock: tx.LOCK.UPDATE });
    if (!storeItem) storeItem = await StoreItem.create({ store_id: storeId, item_id: itemId, stock: 0 }, { transaction: tx });

    // For OUT-like validation: consider originalTypeUpper too (to cover TRANSFER_OUT alias cases)
    const outLike = ["OUT", "TRANSFER_OUT", "PRODUCTION_USE"];
    if (!allowNegative && (outLike.includes(originalTypeUpper) || outLike.includes(normType))) {
      if (Number(convertedQty) > Number(storeItem.stock)) {
        throw new Error(`Insufficient stock: only ${Number(storeItem.stock)} ${item.base_uom_label ?? "base unit"} available, requested ${Number(convertedQty)}`);
      }
    }

    // choose dbType to write (must match your enum)
    const dbType = dbTypeMap[normType] ?? (() => { throw new Error(`Unsupported database type mapping for ${normType}`); })();

    // compute boolean is_in from original intent
    const isIncoming = ["IN", "TRANSFER_IN", "LEFTOVER_RETURN"].includes(originalTypeUpper);

    // safe defaults for from/to store fields to avoid NOT NULL DB errors
    // If browser/client didn't provide from_store_id/to_store_id and DB disallows null, fallback to storeId for sensible cases:
    const safe_from_store_id = (from_store_id !== undefined && from_store_id !== null) ? from_store_id : (dbType === "out" ? storeId : null);
    const safe_to_store_id   = (to_store_id   !== undefined && to_store_id   !== null) ? to_store_id   : (dbType === "in"  ? storeId : null);

    console.log("DBG will insert ledger row", { storeId, itemId, dbType, originalTypeUpper, safe_from_store_id, safe_to_store_id, convertedQty });

    // create ledger row
    const ledger = await StoreItemTransaction.create({
      store_id: storeId,
      item_id: itemId,
      measurement_id: (breakdown && Array.isArray(breakdown.measurementEntries) && breakdown.measurementEntries.length === 1)
        ? breakdown.measurementEntries[0].measurementId
        : (measurementId || null),

      type: dbType,
      transaction_type: originalTypeUpper,
      quantity: ledgerQuantity,
      converted_qty: Number(convertedQty),
      reference,
      note,
      measurement_breakdown: breakdown,
      created_by: actorId ?? null,
      from_store_id: safe_from_store_id,
      to_store_id:   safe_to_store_id,
      is_in: !!isIncoming
    }, { transaction: tx });

    // update storeItem stock
    const positiveTypes = [ "in", "leftover_return" /* left as conceptual; actual mapping uses 'in' */ ];
    const delta = (dbType === "in" ? 1 : -1) * Number(convertedQty);
    storeItem.stock = Number(storeItem.stock) + delta;
    if (storeItem.stock < 0 && !allowNegative) throw new Error("Insufficient stock after update");
    await storeItem.save({ transaction: tx });

    return { ledger, storeItem };
  }); // end transaction
}, // end recordTransaction





  /**
   * Transfer between stores (atomic)
   * options:
   * - fromStoreId, toStoreId, itemId (required)
   * - measurementEntries, customGrams, measurementId, quantity (one-of required)
   * - reference, note, allowNegative, actorId
   *
   * This will create two ledger rows:
   *  - TRANSFER_OUT for fromStoreId (negative converted_qty)
   *  - TRANSFER_IN  for toStoreId (positive converted_qty)
   */
  async transferBetweenStores({
    fromStoreId,
    toStoreId,
    itemId,
    measurementEntries = null,
    customGrams = null,
    measurementId = null,
    quantity = null,
    reference = null,
    note = null,
    allowNegative = false,
    actorId = null
  }) {
    if (!fromStoreId || !toStoreId || !itemId) {
      throw new Error("Missing required params for transferBetweenStores (fromStoreId,toStoreId,itemId)");
    }
    // reuse recordTransaction conversion logic by calling it with setAbsolute=false OR re-calc here.
    // We'll re-use the conversion logic (copy of conversion part) to compute convertedQty & breakdown.
    return await sequelize.transaction(async (tx) => {
      // fetch item
      const item = await Item.findByPk(itemId, { transaction: tx, include: [{ model: Uom, as: "uom" }] });
      if (!item) throw new Error("Item not found");

      const pickConversionValue = (measRow) => {
        return Number(measRow.value_in_base ?? measRow.value_in_smallest ?? measRow.value_in_grams ?? measRow.value ?? 0);
      };

      // compute convertedQty (copy of recordTransaction logic)
      let convertedQty = 0;
      let breakdown = null;
      const hasEntries = Array.isArray(measurementEntries) && measurementEntries.length > 0;
      const hasLegacyQty = (quantity !== undefined && quantity !== null);
      const hasCustom = (customGrams !== undefined && customGrams !== null);

      if (!hasEntries && !hasLegacyQty && !hasCustom) {
        throw new Error("Missing quantity information for transfer: provide measurementEntries OR quantity OR customGrams");
      }

      if (hasCustom) {
        convertedQty = Number(customGrams) || 0;
        if (hasEntries) {
          breakdown = { measurementEntries: [], customGrams: Number(customGrams) };
          const ids = measurementEntries.map(e => Number(e.measurementId ?? e.measurement_id)).filter(id => id && !Number.isNaN(id));
          if (ids.length > 0) {
            const rows = await ItemMeasurement.findAll({ where: { id: ids }, transaction: tx });
            const map = {}; rows.forEach(r => { map[r.id] = pickConversionValue(r); });
            for (const e of measurementEntries) {
              const mId = Number(e.measurementId ?? e.measurement_id);
              const cnt = Number(e.count ?? e.qty ?? e.quantity ?? 0);
              const per = map[mId] ?? 0;
              const subtotal = (per && cnt) ? per * cnt : 0;
              breakdown.measurementEntries.push({ measurementId: mId, count: cnt, conversionPer: per, subtotal });
            }
          } else {
            breakdown.measurementEntries = measurementEntries.map(e => ({ measurementId: Number(e.measurementId ?? e.measurement_id), count: Number(e.count ?? e.qty ?? 0) }));
          }
        } else {
          breakdown = { measurementEntries: [], customGrams: Number(customGrams) };
        }
      } else {
        if (hasEntries) {
          breakdown = { measurementEntries: [], customGrams: 0 };
          for (const e of measurementEntries) {
            const mId = Number(e.measurementId ?? e.measurement_id);
            const cnt = Number(e.count ?? e.qty ?? e.quantity ?? 0);
            if (!mId || Number.isNaN(cnt)) throw new Error("Invalid measurementEntries (measurementId and count required)");
            const meas = await ItemMeasurement.findByPk(mId, { transaction: tx });
            if (!meas) throw new Error(`Measurement id ${mId} not found`);
            const conv = pickConversionValue(meas);
            if (!conv || Number.isNaN(conv)) throw new Error(`Measurement id ${mId} missing conversion value`);
            const add = conv * cnt;
            convertedQty += add;
            breakdown.measurementEntries.push({ measurementId: mId, count: cnt, conversionPer: conv, subtotal: add });
          }
        } else if (hasLegacyQty) {
          if (measurementId) {
            const meas = await ItemMeasurement.findByPk(Number(measurementId), { transaction: tx });
            if (!meas) throw new Error("Measurement not found");
            const conv = pickConversionValue(meas);
            if (!conv || Number.isNaN(conv)) throw new Error("Measurement missing conversion value");
            convertedQty = conv * Number(quantity);
            breakdown = { measurementEntries: [{ measurementId: Number(measurementId), count: Number(quantity), conversionPer: conv, subtotal: convertedQty }], customGrams: 0 };
          } else {
            convertedQty = Number(quantity);
            breakdown = { measurementEntries: [], customGrams: convertedQty };
          }
        }
      }

      // LOCK both store items
      let fromStoreItem = await StoreItem.findOne({
        where: { store_id: fromStoreId, item_id: itemId },
        transaction: tx,
        lock: tx.LOCK.UPDATE
      });
      if (!fromStoreItem) {
        fromStoreItem = await StoreItem.create({ store_id: fromStoreId, item_id: itemId, stock: 0 }, { transaction: tx });
      }

      let toStoreItem = await StoreItem.findOne({
        where: { store_id: toStoreId, item_id: itemId },
        transaction: tx,
        lock: tx.LOCK.UPDATE
      });
      if (!toStoreItem) {
        toStoreItem = await StoreItem.create({ store_id: toStoreId, item_id: itemId, stock: 0 }, { transaction: tx });
      }

      const unitLabel = item.base_uom_label ?? (item.uom ? item.uom.name : null) ?? "base unit";

      // validate from-store has sufficient stock
      if (!allowNegative && Number(convertedQty) > Number(fromStoreItem.stock)) {
        throw new Error(`Insufficient stock in source store: only ${Number(fromStoreItem.stock)} ${unitLabel} available, requested ${Number(convertedQty)} ${unitLabel}`);
      }

      // create OUT ledger for fromStore
      const outLedger = await StoreItemTransaction.create({
        store_id: fromStoreId,
        item_id: itemId,
        measurement_id: (breakdown && Array.isArray(breakdown.measurementEntries) && breakdown.measurementEntries.length === 1)
          ? breakdown.measurementEntries[0].measurementId : (measurementId || null),
        type: TRANSACTION_TYPES.TRANSFER_OUT,
        quantity: (breakdown && Array.isArray(breakdown.measurementEntries) && breakdown.measurementEntries.length === 1) ? Number(breakdown.measurementEntries[0].count) : (hasLegacyQty && !measurementId ? Number(quantity) : null),
        converted_qty: Number(convertedQty),
        reference,
        note,
        measurement_breakdown: breakdown,
        created_by: actorId ?? null,
        from_store_id: fromStoreId,
        to_store_id: toStoreId,
        is_in: false
      }, { transaction: tx });

      // create IN ledger for toStore
      const inLedger = await StoreItemTransaction.create({
        store_id: toStoreId,
        item_id: itemId,
        measurement_id: (breakdown && Array.isArray(breakdown.measurementEntries) && breakdown.measurementEntries.length === 1)
          ? breakdown.measurementEntries[0].measurementId : (measurementId || null),
        type: TRANSACTION_TYPES.TRANSFER_IN,
        quantity: (breakdown && Array.isArray(breakdown.measurementEntries) && breakdown.measurementEntries.length === 1) ? Number(breakdown.measurementEntries[0].count) : (hasLegacyQty && !measurementId ? Number(quantity) : null),
        converted_qty: Number(convertedQty),
        reference,
        note,
        measurement_breakdown: breakdown,
        created_by: actorId ?? null,
        from_store_id: fromStoreId,
        to_store_id: toStoreId,
        is_in: true
      }, { transaction: tx });

      // update stocks
      fromStoreItem.stock = Number(fromStoreItem.stock) - Number(convertedQty);
      toStoreItem.stock = Number(toStoreItem.stock) + Number(convertedQty);

      if (fromStoreItem.stock < 0 && !allowNegative) throw new Error("Insufficient stock after update");

      await fromStoreItem.save({ transaction: tx });
      await toStoreItem.save({ transaction: tx });

      return { outLedger, inLedger, fromStoreItem, toStoreItem };
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
