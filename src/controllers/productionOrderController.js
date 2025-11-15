// src/controllers/productionOrderController.js
const productionOrderService = require("../services/productionOrderService");

exports.getProductionOrders = async (req, res) => {
  try {
    const storeId = req.query.storeId ? Number(req.query.storeId) : null;
    const date = req.query.date ?? null; // expect YYYY-MM-DD
    const result = await productionOrderService.findByStoreAndDate(storeId, date);
    return res.status(200).json({ success: true, message: "Production orders retrieved", data: result || [] });
  } catch (err) {
    console.error("getProductionOrders:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to get production orders", data: null });
  }
};

// --- NEW: totals per store for a date
// GET /api/production-orders/totals?date=YYYY-MM-DD
exports.getTotals = async (req, res) => {
  try {
    const date = req.query.date ?? null;
    const totals = await productionOrderService.aggregateTotalsByDate(date);
    return res.status(200).json({ success: true, message: "Totals retrieved", data: totals });
  } catch (err) {
    console.error("getTotals:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to get totals", data: null });
  }
};

// --- NEW: breakdown by item for store + date
// GET /api/production-orders/totals/:storeId/breakdown?date=YYYY-MM-DD
exports.getBreakdownByStore = async (req, res) => {
  try {
    const storeId = Number(req.params.storeId);
    const date = req.query.date ?? null;
    if (!storeId) return res.status(400).json({ success:false, message: "storeId required", data:null });

    const breakdown = await productionOrderService.aggregateBreakdownByStoreAndDate(storeId, date);
    return res.status(200).json({ success: true, message: "Breakdown retrieved", data: breakdown });
  } catch (err) {
    console.error("getBreakdownByStore:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to get breakdown", data: null });
  }
};

exports.getTotalsByItem = async (req, res) => {
  try {
    const date = req.query.date ?? null;
    const totals = await productionOrderService.aggregateTotalsByItem(date);
    return res.status(200).json({ success: true, message: "Totals by item retrieved", data: totals });
  } catch (err) {
    console.error("getTotalsByItem:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to get totals by item", data: null });
  }
};

exports.createProductionOrder = async (req, res) => {
  try {
    const payload = req.body;
    // basic validation
    if (!payload.store_id || !payload.product_id || payload.date == null) {
      return res.status(400).json({ success:false, message: "store_id, product_id and date required", data:null });
    }
    const created = await productionOrderService.create(payload);
    return res.status(201).json({ success:true, message: "Production order created", data: created });
  } catch (err) {
    console.error("createProductionOrder:", err);
    return res.status(500).json({ success:false, message: err.message || "Failed to create", data:null });
  }
};

exports.updateProductionOrder = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const payload = req.body;
    const updated = await productionOrderService.update(id, payload);
    if (!updated) return res.status(404).json({ success:false, message:"Not found", data:null });
    return res.status(200).json({ success:true, message:"Updated", data: updated });
  } catch (err) {
    console.error("updateProductionOrder:", err);
    return res.status(500).json({ success:false, message: err.message || "Failed to update", data:null });
  }
};

exports.deleteProductionOrder = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ok = await productionOrderService.delete(id);
    if (!ok) return res.status(404).json({ success:false, message:"Not found", data:null });
    return res.status(200).json({ success:true, message:"Deleted", data:null });
  } catch (err) {
    console.error("deleteProductionOrder:", err);
    return res.status(500).json({ success:false, message: err.message || "Failed to delete", data:null });
  }
};
