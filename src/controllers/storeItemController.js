// controllers/storeItemController.js
"use strict";

const storeService = require("../services/storeService"); // (assumed) service to fetch store
const brandService = require("../services/brandService"); // (assumed) service to fetch brand by id / name
const itemService = require("../services/itemService");   // existing itemService (we will add method)
const { Op } = require("sequelize");
const models = require("../models");

// parse is_production query value into undefined | 1 | 0
// parse is_production query value into undefined | true | false
function parseIsProductionQuery(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "no") return false;
  // unknown -> undefined (treat as "no filter")
  return undefined;
}



async function listItemsByStore(req, res) {
  try {
    const storeId = Number(req.params.storeId);
    if (!storeId) {
      return res.status(400).json({ success: false, message: "Invalid storeId" });
    }

    // optional query params
    const q = (req.query.q || req.query.search || "").toString().trim();
    const rawIsProduction = req.query.is_production;
    const isProduction = parseIsProductionQuery(rawIsProduction);
    const limit = Math.min(Number(req.query.limit || 200), 1000);


    // fetch store
    const store = await storeService.getStoreById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found" });
    }

    // try resolve brand either by store.brand_id or by brand name derived from store.name
    let brand = null;

    if (store.brand_id) {
      brand = await brandService.getBrandById(store.brand_id);
    }

    if (!brand) {
      // try to find a brand by looking up brands.nama using the store.name
      // naive approach: pick first brand whose nama appears in store.name (case-insensitive)
      const storeName = (store.name || "").toString().toLowerCase();
      if (storeName) {
        brand = await brandService.findBrandByNameInStoreName(storeName);
      }
    }

    // if brand resolved and brand.kode exists, use kode-based search
    if (brand && brand.kode) {
      // search by code prefix like 'PA.%' or 'RG.%'
      const codePrefix = String(brand.kode).trim();
      const rows = await itemService.findItemsByCodePrefix(codePrefix, { q, is_production: isProduction, limit });
      return res.json({ success: true, data: rows });
    }

    // fallback: if brand found but no kode, try fuzzy search by brand.name inside item.code or item name
    if (brand && !brand.kode) {
      const brandName = (brand.nama || brand.name || "").toString().trim();
      const rows = await itemService.findItemsByBrandNameFragment(brandName, { q, is_production: isProduction, limit });
      return res.json({ success: true, data: rows });
    }

    // final fallback: try derive brand-like token from store.name (first two letters upper-case maybe)
    // e.g. "Roti Goolung Pakerisan" -> try tokens ["roti","goolung","pakerisan"]
    const tokens = (store.name || "").toString().split(/\s+/).map(t => t.trim()).filter(Boolean);
    const fallbackRows = await itemService.findItemsByBrandTokens(tokens, { q, is_production: isProduction, limit });

    return res.json({ success: true, data: fallbackRows });
  } catch (err) {
    console.error("listItemsByStore error:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
}

module.exports = {
  listItemsByStore
};
