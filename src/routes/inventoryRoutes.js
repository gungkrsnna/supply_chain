// src/routes/inventoryRoutes.js
const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");

// List inventory for a store
router.get("/stores/:storeId/inventory", inventoryController.getInventory);
// Create transaction (IN/OUT/TRANSFER/PRODUCTION/LEFTOVER/ADJUSTMENT)
router.post("/stores/:storeId/transactions", inventoryController.createTransaction);
// Rebuild stock from ledger for single item
router.post("/stores/:storeId/rebuild/:itemId", inventoryController.rebuildStock);
// Admin set absolute
router.patch("/stores/:storeId/inventory/:itemId/set", inventoryController.setAbsoluteStock);
// Ledger per item (optional)
router.get("/stores/:storeId/inventory/:itemId/ledger", inventoryController.getItemLedger);

module.exports = router;
