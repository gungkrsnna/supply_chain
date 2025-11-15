// controllers/storeRequestController.js
"use strict";

const storeRequestService = require("../services/storeRequestService");

async function createStoreRequest(req, res) {
  try {
    // expected body: { storeId, createdBy?, note?, items: [{ item_id, requested_qty, uom_id?, note? }, ...] }
    const { storeId, createdBy, note, items } = req.body;
    const created = await storeRequestService.createStoreRequest({ storeId: Number(storeId), createdBy: createdBy ?? null, note: note ?? null, items });
    return res.status(201).json({ success: true, message: "Store request created", data: created });
  } catch (err) {
    console.error("createStoreRequest error:", err && err.stack ? err.stack : err);
    return res.status(400).json({ success: false, message: err.message || "Failed to create store request", data: null });
  }
}

async function listRequestsForStore(req, res) {
  try {
    const storeId = Number(req.params.storeId);
    if (!storeId) return res.status(400).json({ success:false, message: "Invalid store id" });
    const rows = await storeRequestService.listRequestsByStore(storeId, { status: req.query.status });
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("listRequestsForStore error:", err);
    return res.status(500).json({ success:false, message: err.message || "Failed to list requests" });
  }
}

async function getRequest(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success:false, message: "Invalid id" });
    const row = await storeRequestService.getRequestById(id);
    if (!row) return res.status(404).json({ success:false, message: "Request not found" });
    return res.json({ success:true, data: row });
  } catch (err) {
    console.error("getRequest error:", err);
    return res.status(500).json({ success:false, message: err.message || "Failed to get request" });
  }
}

async function updateRequestStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { status, processedBy } = req.body;
    if (!id) return res.status(400).json({ success:false, message: "Invalid id" });
    const updated = await storeRequestService.updateStatus(id, status, processedBy ?? null);
    if (!updated) return res.status(404).json({ success:false, message: "Request not found" });
    return res.json({ success:true, message: "Status updated", data: updated });
  } catch (err) {
    console.error("updateRequestStatus error:", err);
    return res.status(400).json({ success:false, message: err.message || "Failed to update status" });
  }
}

module.exports = {
  createStoreRequest,
  listRequestsForStore,
  getRequest,
  updateRequestStatus
};
