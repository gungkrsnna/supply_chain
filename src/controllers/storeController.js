// src/controllers/storeController.js
const storeService = require("../services/storeService");

module.exports = {
  // controllers/storeController.js (potongan)
  async createStore(req, res) {
    try {
      console.log("➡️ createStore called");
      console.log("  req.params:", req.params);
      console.log("  req.query:", req.query);
      console.log("  req.headers:", {
        'content-type': req.headers['content-type'],
        authorization: req.headers.authorization ? '<<present>>' : '<<none>>'
      });
      console.log("  req.body (raw):", req.body);

      // normalisasi: ambil brandId dari path params, camelCase body, atau snake_case body
      const payload = { ...req.body };
      payload.brandId = req.params.brandId || req.body.brandId || req.body.brand_id || req.body.brandId || payload.brandId;

      console.log("  normalized payload ->", payload);

      if (!payload.brandId) {
        console.warn("  ❗ missing brandId in payload");
        return res.status(422).json({ success:false, message: 'brandId is required' });
      }

      const store = await storeService.createStore(payload);
      console.log("  <- created store id:", store.id);
      return res.status(201).json({ success: true, data: store });
    } catch (err) {
      console.error("createStore error:", err);
      return res.status(400).json({ success:false, message: err.message });
    }
  },


  async getAllStores(req, res) {
    try {
      console.log("➡️ getAllStores called");
      console.log("  req.params:", req.params);
      console.log("  req.query:", req.query);

      const { brandId, q } = req.query;
      console.log("  brandId param:", brandId, " q:", q);

      const opts = {};
      if (brandId) opts.brandId = brandId;
      if (q) opts.q = q;

      console.log("  opts ->", opts);

      const stores = await storeService.getAllStores(opts);

      console.log(`  <- returning ${Array.isArray(stores) ? stores.length : 0} stores`);
      return res.json({ success: true, message: "Stores retrieved successfully", data: stores });
    } catch (err) {
      console.error("getAllStores error:", err);
      return res.status(500).json({ success: false, message: err.message, data: null });
    }
  },

  async getStoreById(req, res) {
    try {
      const store = await storeService.getStoreById(req.params.id);
      if (!store) return res.status(404).json({ success: false, message: "Store not found", data: null });
      res.json({ success: true, message: "Store retrieved successfully", data: store });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message, data: null });
    }
  },

  async updateStore(req, res) {
    try {
      // normalisasi body agar service menerima brandId
      const payload = { ...req.body };
      if (req.params.brandId) payload.brandId = req.params.brandId;
      payload.brandId = payload.brandId || req.body.brandId || req.body.brand_id;

      const store = await storeService.updateStore(req.params.id, payload);
      if (!store) return res.status(404).json({ success: false, message: "Store not found", data: null });
      return res.json({ success: true, message: "Store updated successfully", data: store });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message, data: null });
    }
  },


  async deleteStore(req, res) {
    try {
      const deleted = await storeService.deleteStore(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: "Store not found", data: null });
      res.json({ success: true, message: "Store deleted successfully", data: null });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message, data: null });
    }
  },
};
