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
exports.createTransaction = async (req, res) => {
  try {
    const storeId = Number(req.params.storeId ?? req.params.id);
    if (!storeId) return res.status(422).json({ success: false, message: "Invalid storeId" });

    const actorId = req.user?.id || null;

    // Accept multiple payload shapes:
    // - legacy: { measurementId, quantity, type }
    // - new: { measurementEntries: [{measurementId, count}, ...], customGrams, type }
    const measurementEntries = Array.isArray(req.body.measurementEntries) ? req.body.measurementEntries : null;
    const customGrams = req.body.customGrams ?? (req.body.customGrams === 0 ? 0 : null);
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

    const result = await inventoryService.recordTransaction({
      storeId,
      itemId: Number(req.body.itemId ?? req.body.item_id),
      measurementId: measurementId ? Number(measurementId) : null,
      quantity: (quantity !== undefined && quantity !== null) ? Number(quantity) : null,
      measurementEntries,
      customGrams: (customGrams !== null && customGrams !== undefined) ? Number(customGrams) : null,
      type,
      reference,
      note,
      allowNegative,
      actorId
    });

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
