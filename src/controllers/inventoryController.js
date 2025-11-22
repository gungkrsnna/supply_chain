// src/controllers/inventoryController.js
const inventoryService = require("../services/inventoryService");

// GET  /api/stores/:storeId/inventory
exports.getInventory = async (req, res) => {
  try {
    const storeId = Number(req.params.storeId || req.params.id);
    if (!storeId) return res.status(400).json({ success: false, message: "Invalid store id" });

    // If you want full item + measurements, use getStoreInventoryWithItem
    const includeItems = req.query.includeItems === "1" || req.query.includeItems === "true";
    if (includeItems) {
      const data = await inventoryService.getStoreInventoryWithItem(storeId);
      return res.status(200).json({ success: true, data });
    }

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 200);
    const data = await inventoryService.getStoreInventory(storeId, page, limit);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("inventoryController.getInventory error", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to retrieve inventory" });
  }
};

// POST /api/stores/:storeId/transactions
// src/controllers/inventoryController.js (replace createTransaction)
// accept measurementEntries: [{ measurementId, count }] and customGrams
// src/controllers/inventoryController.js
// (ganti hanya exports.createTransaction = async (req, res) => { ... } )

exports.createTransaction = async (req, res) => {
  try {
    console.log("DBG incoming createTransaction req.body:", req.body);
    console.log("DBG req.user:", req.user && { id: req.user.id, storeId: req.user.storeId, isAdmin: req.user.isAdmin });
    const storeId = Number(req.params.storeId ?? req.params.id);
    if (!storeId) return res.status(422).json({ success: false, message: "Invalid storeId" });

    const actorId = req.user?.id || null;

    // Accept multiple payload shapes:
    // - legacy: { measurementId, quantity, type }
    // - new: { measurementEntries: [{measurementId, count}, ...], customGrams OR customAmount, type }
    const measurementEntries = Array.isArray(req.body.measurementEntries) ? req.body.measurementEntries : null;

    // accept alias: customGrams OR customAmount OR customBase (frontend may send different names)
    let customInput =
      req.body.customGrams !== undefined && req.body.customGrams !== null ? req.body.customGrams
      : (req.body.customAmount !== undefined && req.body.customAmount !== null ? req.body.customAmount
      : (req.body.customBase !== undefined && req.body.customBase !== null ? req.body.customBase
      : null));

    // fallbacks
    const measurementId = req.body.measurementId ?? null;
    const quantity = req.body.quantity ?? null;
    const type = req.body.type;
    const reference = req.body.reference ?? null;
    const note = req.body.note ?? null;
    const allowNegative = Boolean(req.body.allowNegative);

    if (!type) return res.status(422).json({ success: false, message: "type is required" });

    // permission check optional:
    if (!req.user?.isAdmin && req.user?.storeId && Number(req.user.storeId) !== storeId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Convert measurementEntries -> base unit total if measurementEntries present
    let totalFromMeasurements = 0;
    try {
      if (Array.isArray(measurementEntries) && measurementEntries.length > 0) {
        const models = require("../models");
        // collect measurement ids (support either measurementId or measurement_id key)
        const ids = measurementEntries
          .map(me => Number(me.measurementId ?? me.measurement_id))
          .filter(id => id && !Number.isNaN(id));

        if (ids.length > 0) {
          const rows = await models.ItemMeasurement.findAll({
            where: { id: ids }
          });

          // build map id -> conversion value (prefer value_in_base -> value_in_grams -> value)
          const map = {};
          rows.forEach(r => {
            const v = Number(r.value_in_base ?? r.value_in_grams ?? r.value ?? 0);
            map[r.id] = Number.isFinite(v) ? v : 0;
          });

          for (const me of measurementEntries) {
            const mid = Number(me.measurementId ?? me.measurement_id);
            const cnt = Number(me.count ?? me.qty ?? me.quantity ?? 0);
            const per = map[mid] ?? 0;
            if (cnt && per) totalFromMeasurements += Number(per) * Number(cnt);
          }
        }
      }
    } catch (convErr) {
      console.warn("measurement conversion failed", convErr);
      // don't fail entire request; conversion best-effort. But we will still send data to service.
    }

    // normalize custom input to number or null
    let customNumber = null;
    if (customInput !== null && customInput !== undefined && customInput !== "") {
      const n = Number(customInput);
      if (!Number.isNaN(n)) customNumber = n;
    }

    // Combine totals (both measurement-derived and explicit custom)
    const convertedTotal = (totalFromMeasurements || 0) + (customNumber || 0);

    // If backend service expects customGrams as required field, provide it (even if 0)
    // sebelum: payloadForService = { storeId, itemId, ... }
    const payloadForService = {
      storeId,
      itemId: Number(req.body.itemId ?? req.body.item_id),
      measurementId: measurementId ? Number(measurementId) : null,
      quantity: (quantity !== undefined && quantity !== null) ? Number(quantity) : null,
      measurementEntries: measurementEntries,
      customGrams: convertedTotal > 0 ? Number(convertedTotal) : (customNumber !== null ? Number(customNumber) : null),
      type,
      reference,
      note,
      allowNegative,
      actorId,
      // ** tambah baris berikut **
      to_store_id: req.body.to_store_id ?? req.body.toStoreId ?? null,
      from_store_id: req.body.from_store_id ?? req.body.fromStoreId ?? null
    };


    // Guard: make sure at least one of quantity/measurementEntries/customGrams is present else return friendly error
    const hasQuantityInfo =
      (payloadForService.quantity !== null && payloadForService.quantity !== undefined) ||
      (Array.isArray(payloadForService.measurementEntries) && payloadForService.measurementEntries.length > 0) ||
      (payloadForService.customGrams !== null && payloadForService.customGrams !== undefined);

    if (!hasQuantityInfo) {
      return res.status(422).json({
        success: false,
        message: "Missing quantity information: provide quantity OR measurementEntries OR customGrams/customAmount"
      });
    }

        // ... setelah console.log(...)
    const toStoreIdParam = payloadForService.to_store_id ? Number(payloadForService.to_store_id) : null;
    const isTransferRequest = !!toStoreIdParam;

    if (isTransferRequest) {
      // call transferBetweenStores instead of recordTransaction
      const out = await inventoryService.transferBetweenStores({
        fromStoreId: storeId,
        toStoreId: toStoreIdParam,
        itemId: payloadForService.itemId,
        measurementEntries: payloadForService.measurementEntries,
        customGrams: payloadForService.customGrams,
        measurementId: payloadForService.measurementId,
        quantity: payloadForService.quantity,
        reference: payloadForService.reference,
        note: payloadForService.note,
        allowNegative: payloadForService.allowNegative,
        actorId: payloadForService.actorId
      });

      return res.status(201).json({ success: true, data: out });
    }

    // fallback: single-store recordTransaction
    const result = await inventoryService.recordTransaction(payloadForService);
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error("inventoryController.createTransaction error", err);
    return res.status(400).json({ success: false, message: err.message || "Failed to create transaction" });
  }
};



// POST /api/stores/:storeId/rebuild/:itemId
exports.rebuildStock = async (req, res) => {
  try {
    const storeId = Number(req.params.storeId || req.params.id);
    const itemId = Number(req.params.itemId || req.params.itemId);
    if (!storeId || !itemId) return res.status(400).json({ success: false, message: "Invalid params" });
    const si = await inventoryService.rebuildStoreStockFromTransactions(storeId, itemId);
    return res.status(200).json({ success: true, data: si });
  } catch (err) {
    console.error("inventoryController.rebuildStock error", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to rebuild stock" });
  }
};

// PATCH /api/stores/:storeId/inventory/:itemId/set
exports.setAbsoluteStock = async (req, res) => {
  try {
    const storeId = Number(req.params.storeId || req.params.id);
    const itemId = Number(req.params.itemId);
    const { absoluteStock, reason } = req.body;
    const actorId = req.user?.id || null;

    if (typeof absoluteStock !== "number") return res.status(422).json({ success: false, message: "absoluteStock must be a number" });

    // only admin allowed
    if (!req.user?.isAdmin) return res.status(403).json({ success: false, message: "Forbidden" });

    const out = await inventoryService.setAbsoluteStock({ storeId, itemId, absoluteStock, reason, actorId });
    return res.status(200).json({ success: true, data: out });
  } catch (err) {
    console.error("inventoryController.setAbsoluteStock error", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to set absolute stock" });
  }
};

// GET /api/stores/:storeId/inventory/:itemId/ledger
exports.getItemLedger = async (req, res) => {
  try {
    const storeId = Number(req.params.storeId || req.params.id);
    const itemId = Number(req.params.itemId);
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 200);
    const offset = (page - 1) * limit;

    const models = require("../models");
    const rows = await models.StoreItemTransaction.findAll({
      where: { store_id: storeId, item_id: itemId },
      order: [["createdAt", "DESC"]],
      offset,
      limit
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("inventoryController.getItemLedger error", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to fetch ledger" });
  }
};


// new handler
exports.getStoreItem = async (req, res) => {
  try {
    const storeId = Number(req.params.storeId || req.params.id);
    const itemId = Number(req.params.itemId);
    if (!storeId || !itemId) return res.status(400).json({ success: false, message: "Invalid params" });

    const si = await inventoryService.getStoreItem(storeId, itemId);
    return res.json({ success: true, data: si });
  } catch (err) {
    console.error("inventoryController.getStoreItem error", err);
    return res.status(500).json({ success:false, message: err.message || "Failed to fetch store item" });
  }
};
