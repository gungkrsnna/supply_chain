// controllers/storeRequestController.js
"use strict";

const storeRequestService = require("../services/storeRequestService");

// Create
async function createStoreRequest(req, res) {
  try {
    // expected body: { storeId, createdBy?, note?, items: [{ item_id, requested_qty, uom_id?, note? }, ...] }
    const { storeId, createdBy, note, items } = req.body;
    if (!storeId) return res.status(400).json({ success: false, message: "storeId is required", data: null });
    const created = await storeRequestService.createStoreRequest({
      storeId: Number(storeId),
      createdBy: createdBy ?? null,
      note: note ?? null,
      items
    });
    return res.status(201).json({ success: true, message: "Store request created", data: created });
  } catch (err) {
    console.error("createStoreRequest error:", err && err.stack ? err.stack : err);
    return res.status(400).json({ success: false, message: err.message || "Failed to create store request", data: null });
  }
}

// List by store
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

// Get request by id or uuid
async function getRequest(req, res) {
  try {
    const idParam = req.params.id;
    if (!idParam) return res.status(400).json({ success:false, message: "Invalid id" });

    // detect UUID (simple regex for UUID v4 format) else treat as numeric id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idParam);
    const row = isUuid ? await storeRequestService.getRequestByUuid(idParam) : await storeRequestService.getRequestById(Number(idParam));

    if (!row) return res.status(404).json({ success:false, message: "Request not found" });
    return res.json({ success:true, data: row });
  } catch (err) {
    console.error("getRequest error:", err);
    return res.status(500).json({ success:false, message: err.message || "Failed to get request" });
  }
}

// update status by id or uuid
async function updateRequestStatus(req, res) {
  try {
    const idParam = req.params.id;
    const { status, processedBy } = req.body;
    if (!idParam) return res.status(400).json({ success:false, message: "Invalid id" });

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idParam);
    const updated = isUuid
      ? await storeRequestService.updateStatusByUuid(idParam, status, processedBy ?? null)
      : await storeRequestService.updateStatus(Number(idParam), status, processedBy ?? null);

    if (!updated) return res.status(404).json({ success:false, message: "Request not found" });
    return res.json({ success:true, message: "Status updated", data: updated });
  } catch (err) {
    console.error("updateRequestStatus error:", err);
    return res.status(400).json({ success:false, message: err.message || "Failed to update status" });
  }
}

async function bulkApproveRequests(req, res) {
  try {
    // expected body: { requestIds: ['uuid1', 'uuid2', ...], processedBy? }
    const { requestIds, processedBy } = req.body;
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ success: false, message: "requestIds required" });
    }

    const updated = await storeRequestService.bulkApprove(requestIds, processedBy ?? null);
    return res.json({ success: true, message: `Approved ${updated} requests` });
  } catch (err) {
    console.error("bulkApproveRequests error:", err);
    return res.status(500).json({ success:false, message: err.message || "Failed to bulk approve" });
  }
}

// controllers/storeRequestController.js (append)
async function listRequestsByBrand(req, res) {
  try {
    const brandId = Number(req.params.brandId);
    if (!brandId) return res.status(400).json({ success:false, message: "Invalid brand id" });

    // optional query: status, q (search), limit, page
    const opts = {
      status: req.query.status,
      q: req.query.q,
      limit: Number(req.query.limit) || 100,
      page: Number(req.query.page) || 1
    };

    const rows = await require("../services/storeRequestService").listRequestsByBrand(brandId, opts);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("listRequestsByBrand error:", err);
    return res.status(500).json({ success:false, message: err.message || "Failed to list requests by brand" });
  }
}


async function printDeliveryNote(req, res) {
  try {
    // expected body: { requestIds: ['uuid1', ...], driverName?, vehicleNo? }
    const { requestIds, driverName = "", vehicleNo = "" } = req.body;
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ success:false, message: "requestIds required" });
    }

    // service will gather request data and items
    const deliveryData = await storeRequestService.getRequestsForDelivery(requestIds);

    // generate PDF and stream to client
    return storeRequestService.generateDeliveryPdfStream(deliveryData, { driverName, vehicleNo }, res);
    // generateDeliveryPdfStream handles res (sets headers and pipe)
  } catch (err) {
    console.error("printDeliveryNote error:", err);
    return res.status(500).json({ success:false, message: err.message || "Failed to generate delivery note" });
  }
}




module.exports = {
  createStoreRequest,
  listRequestsForStore,
  getRequest,
  updateRequestStatus,
  bulkApproveRequests,
  printDeliveryNote,
  listRequestsByBrand
};
