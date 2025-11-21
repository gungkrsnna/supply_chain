// controllers/centralItemController.js
"use strict";

const centralService = require("../services/centralService");
const models = require("../models");

async function listCentralItems(req, res) {
  try {
    const storeId = Number(req.params.centralId); // treat as store_id
    if (!storeId) return res.status(400).json({ success: false, message: "Invalid centralId" });

    const q = (req.query.q || "").toString().trim();
    const limit = Math.min(Number(req.query.limit || 200), 1000);

    const rows = await centralService.findCentralItems(storeId, { q, limit });
    return res.json({ success: true, data: rows });
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

module.exports = {
  listCentralItems,
  getCentralItem,
  adjustCentralStock,
  transferToStore
};
