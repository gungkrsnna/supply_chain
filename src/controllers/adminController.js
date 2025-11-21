// src/controllers/adminController.js
"use strict";

const adminService = require("../services/adminService");
const storeRequestService = require('../services/storeRequestService');

async function listBrands(req, res) {
  try {
    // optional: allow query param ?onlyActive=1
    const onlyActive = req.query.onlyActive === "1" || req.query.onlyActive === "true";
    const brands = await adminService.listBrands({ onlyActive });
    return res.json({ success: true, data: brands });
  } catch (err) {
    console.error("listBrands error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to list brands" });
  }
}

async function listRequestsForBrand(req, res) {
  try {
    const brandId = Number(req.params.brandId);
    const opts = { status: req.query.status, limit: Number(req.query.limit) || 1000 };
    const rows = await storeRequestService.listRequestsByBrand(brandId, opts);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("listRequestsForBrand error:", err);
    return res.status(500).json({ success:false, message: err.message || "Failed" });
  }
}

module.exports = {
  listBrands,
  listRequestsForBrand
};
