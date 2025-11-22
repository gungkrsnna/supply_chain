// controllers/centralItemController.js
"use strict";

const centralService = require("../services/centralService");
const models = require("../models");

async function listCentralItems(req, res) {
  try {
    const storeId = Number(req.params.centralId);
    if (!storeId) return res.status(400).json({ success: false, message: "Invalid centralId" });

    const q = (req.query.q || req.query.search || "").toString().trim();
    const limit = Math.min(Number(req.query.limit || 200), 1000);

    const rows = await centralService.findCentralItems(storeId, { q, limit });

    // --- collect item ids to fetch measurements in batch ---
    const itemIds = [];
    for (const ci of rows) {
      const r = ci.get ? ci.get({ plain: true }) : ci;
      const itemRel = r.item || r.Item || null;
      const maybeItemId = r.item_id ?? itemRel?.id ?? null;
      if (maybeItemId) itemIds.push(Number(maybeItemId));
    }

    // unique
    const uniqItemIds = Array.from(new Set(itemIds)).filter(Boolean);

    let measurementsByItem = {};
    try {
      if (uniqItemIds.length > 0 && models.ItemMeasurement) {
        const measurements = await models.ItemMeasurement.findAll({
          where: { item_id: uniqItemIds },
          raw: true
        });
        // group by item_id
        measurementsByItem = measurements.reduce((acc, m) => {
          const k = String(m.item_id);
          acc[k] = acc[k] || [];
          acc[k].push(m);
          return acc;
        }, {});
      }
    } catch (e) {
      console.warn("failed to load item measurements", e);
      measurementsByItem = {};
    }

    // flatten rows to consistent shape:
    const mapped = (rows || []).map(ci => {
      const r = ci.get ? ci.get({ plain: true }) : ci; // handle instance or plain
      const itemRel = r.item || r.Item || null;
      const productName = itemRel?.name ?? r.product_name ?? `Item #${r.item_id ?? r.id}`;
      const productCode = itemRel?.code ?? r.product_code ?? null;
      const uom = itemRel?.uom?.name ?? itemRel?.uom_name ?? r.unit ?? null;
      const isProd = (itemRel && (itemRel.is_production === 1 || itemRel.is_production === true)) || r.is_production === 1 || r.is_production === true ? true : false;

      // attach measurements from grouped result if available (fallback to r.measurements)
      const iid = r.item_id ?? itemRel?.id ?? null;
      const measurements = (iid && measurementsByItem[String(iid)]) ? measurementsByItem[String(iid)] : (r.measurements ?? itemRel?.measurements ?? []);

      return {
        id: r.id ?? (itemRel ? `item-${itemRel.id}` : null),
        item_id: r.item_id ?? (itemRel ? itemRel.id : null),
        product_name: productName,
        product_code: productCode,
        qty: Number(r.stock ?? r.qty ?? r.quantity ?? 0),
        unit: uom,
        min_stock: Number(r.min_stock ?? itemRel?.min_stock ?? 0),
        note: r.note ?? null,
        createdAt: r.createdAt ?? r.created_at ?? null,
        updatedAt: r.updatedAt ?? r.updated_at ?? null,
        is_production: isProd,
        measurements, // <-- measurements included here
        raw: r
      };
    });

    return res.json({ success: true, data: mapped });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}



async function getCentralItem(req, res) {
  try {
    const storeId = Number(req.params.centralId);
    const itemId = Number(req.params.itemId);
    if (!storeId || !itemId) return res.status(400).json({ success: false, message: "Invalid ids" });

    const row = await centralService.getCentralItem(storeId, itemId);
    if (!row) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function adjustCentralStock(req, res) {
  try {
    const storeId = Number(req.params.centralId);
    const { item_id, qty, type, note, measurement_id, reference } = req.body;
    const actorId = req.user?.id ?? null;

    if (!storeId || !item_id || typeof qty === "undefined") return res.status(400).json({ success: false, message: "Missing parameters" });

    const delta = Number(qty);
    if (Number.isNaN(delta) || delta === 0) return res.status(400).json({ success: false, message: "qty must be non-zero number" });

    const updated = await centralService.adjustStock(storeId, item_id, delta, { type: type || "adjustment", note, measurement_id, reference, actorId });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function transferToStore(req, res) {
  const sequelize = models.sequelize;
  const trx = await sequelize.transaction();
  try {
    const storeId = Number(req.params.centralId); // central store_id
    const { store_id: targetStoreId, item_id, qty, measurement_id, note, reference } = req.body;
    const actorId = req.user?.id ?? null;

    if (!storeId || !targetStoreId || !item_id || !qty) {
      await trx.rollback();
      return res.status(400).json({ success: false, message: "Missing parameters" });
    }

    const requestedQty = Number(qty);
    if (requestedQty <= 0) {
      await trx.rollback();
      return res.status(400).json({ success: false, message: "qty must be > 0" });
    }

    // convert qty -> convertedQty if needed (use itemService.convertToBase if exists)
    let convertedQty = requestedQty;
    if (measurement_id && typeof require("../services/itemService").convertToBase === "function") {
      const itemService = require("../services/itemService");
      convertedQty = await itemService.convertToBase(item_id, requestedQty, measurement_id);
    }

    // 1) deduct from central
    await centralService.adjustStock(storeId, item_id, -convertedQty, { type: "transfer_to_store", note, reference, meta: { target_store: targetStoreId, original_qty: requestedQty, original_measurement_id: measurement_id }, actorId, t: trx });

    // 2) add to target store (update StoreItem)
    let storeItem = await models.StoreItem.findOne({ where: { store_id: targetStoreId, item_id }, transaction: trx, lock: trx.LOCK.UPDATE });
    if (!storeItem) {
      storeItem = await models.StoreItem.create({ store_id: targetStoreId, item_id, stock: 0 }, { transaction: trx });
    }
    storeItem.stock = Number(storeItem.stock) + Number(convertedQty);
    await storeItem.save({ transaction: trx });

    if (models.StoreItemTransaction) {
      await models.StoreItemTransaction.create({
        store_id: targetStoreId,
        item_id,
        measurement_id: measurement_id ?? null,
        type: "transfer_from_central",
        quantity: measurement_id ? requestedQty : null,
        converted_qty: convertedQty,
        reference: reference ?? null,
        note,
        meta: { from_central: storeId },
        operator_id: actorId ?? null
      }, { transaction: trx });
    }

    await trx.commit();
    return res.json({ success: true, message: "Transfer completed", data: { storeItem } });
  } catch (err) {
    await trx.rollback();
    console.error("transferToStore error:", err);
    return res.status(500).json({ success: false, message: err.message || "Transfer failed" });
  }
}

async function getCentral(req, res) {
  try {
    const storeId = Number(req.params.centralId);
    if (!storeId) return res.status(400).json({ success: false, message: "Invalid centralId" });

    const store = await models.Store.findByPk(storeId);
    if (!store) return res.status(404).json({ success: false, message: "Central not found" });

    return res.json({ success: true, data: { id: store.id, name: store.name, address: store.address } });
  } catch (err) {
    console.error("getCentral error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// controllers: createCentralTransaction
// controllers/centralItemController.js
async function createCentralTransaction(req, res) {
  const sequelize = models.sequelize;
  const trx = await sequelize.transaction();
  try {
    const storeId = Number(req.params.centralId);
    const {
      itemId,
      measurementEntries, // [{ measurementId, count }]
      customBase,
      quantity,
      uomId,
      type = "IN",
      note,
      reference
    } = req.body;

    if (!storeId || !itemId) {
      await trx.rollback();
      return res.status(400).json({ success: false, message: "Missing parameters (centralId or itemId)" });
    }

    // Try load measurement metadata if helpful (optional)
    let measurements = null;
    if (Array.isArray(measurementEntries) && measurementEntries.length > 0) {
      try {
        if (models.ItemMeasurement) {
          measurements = await models.ItemMeasurement.findAll({ where: { item_id: itemId }, transaction: trx });
          measurements = (measurements || []).map(r => (r.get ? r.get({ plain: true }) : r));
        }
      } catch (e) {
        measurements = null;
      }
    }

    // compute convertedQty in base units
    let convertedQty = 0;
    if (Array.isArray(measurementEntries) && measurementEntries.length > 0) {
      for (const entry of measurementEntries) {
        const mid = Number(entry.measurementId);
        const cnt = Number(entry.count || 0);
        if (!mid || !cnt || cnt <= 0) continue;

        const mmeta = Array.isArray(measurements) ? measurements.find(x => Number(x.id) === mid) : null;
        // prefer explicit value_in_base, then value, fallback to 1
        const perBase = Number(mmeta?.value_in_base ?? mmeta?.value ?? entry.value_in_base ?? entry.value ?? 1);
        const usePerBase = (perBase && !Number.isNaN(perBase) && Number(perBase) !== 0) ? perBase : 1;
        convertedQty += usePerBase * cnt;
      }
      if (customBase && !Number.isNaN(Number(customBase))) convertedQty += Number(customBase);
    } else if (customBase && !Number.isNaN(Number(customBase))) {
      convertedQty = Number(customBase);
    } else if (quantity && !Number.isNaN(Number(quantity))) {
      // try itemService conversion if available
      let converted = Number(quantity);
      try {
        const itemService = require("../services/itemService");
        if (typeof itemService.convertToBase === "function") {
          const maybe = await itemService.convertToBase(itemId, converted, uomId || null);
          if (!Number.isNaN(Number(maybe))) converted = Number(maybe);
        }
      } catch (e) {
        // fallback: keep quantity
      }
      convertedQty = converted;
    } else {
      convertedQty = 0;
    }

    if (Number.isNaN(convertedQty) || Number(convertedQty) === 0) {
      await trx.rollback();
      return res.status(400).json({ success: false, message: "converted_qty is zero or invalid — provide measurementEntries/customBase or quantity" });
    }

    // decide single measurement_id + original quantity if appropriate
    let measurement_id_to_store = null;
    let original_measurement_quantity = null;
    if (Array.isArray(measurementEntries) && measurementEntries.length === 1) {
      measurement_id_to_store = Number(measurementEntries[0].measurementId) || null;
      original_measurement_quantity = Number(measurementEntries[0].count) || null;
    }

    // apply sign for IN/OUT
    const delta = type === "OUT" ? -convertedQty : convertedQty;

    const updated = await centralService.adjustStock(storeId, itemId, delta, {
      type: type === "OUT" ? "out" : "in",
      note,
      reference,
      actorId: req.user?.id ?? null,
      t: trx,
      measurement_id: measurement_id_to_store,      // <-- important: set this so central_item_transactions.measurement_id filled
      quantity: original_measurement_quantity,     // <-- original measurement count (if single)
      meta: {
        measurementEntries: measurementEntries ?? null,
        customBase: customBase ?? null,
        original_quantity: quantity ?? null,
        original_uom: uomId ?? null
      }
    });

    await trx.commit();
    return res.json({ success: true, data: updated });
  } catch (err) {
    await trx.rollback();
    console.error("createCentralTransaction error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed" });
  }
}



module.exports = {
  listCentralItems,
  getCentralItem,
  adjustCentralStock,
  transferToStore,
  getCentral,
  createCentralTransaction
};
