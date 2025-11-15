// src/routes/storeRoutes.js
const express = require("express");
const storeController = require("../controllers/storeController");
const inventoryController = require("../controllers/inventoryController");
const router = express.Router();

// debug helpful log — hapus setelah berhasil
console.log("storeController keys =", Object.keys(storeController || {}));
console.log("inventoryController keys =", Object.keys(inventoryController || {}));

// store CRUD
router.post("/", storeController.createStore);
router.get("/", storeController.getAllStores); // GET /api/stores?brandId=xxx&q=...
router.get("/:id", storeController.getStoreById);
router.put("/:id", storeController.updateStore);
router.delete("/:id", storeController.deleteStore);

// inventory for store
// Use inventoryController.getInventory which accepts either req.params.storeId or req.params.id
router.get("/:id/inventory", inventoryController.getInventory);
router.post("/:id/transactions", inventoryController.createTransaction);

// admin set absolute stock
router.patch("/:id/inventory/:itemId/set", inventoryController.setAbsoluteStock);

// ledger per item
router.get("/:id/inventory/:itemId/ledger", inventoryController.getItemLedger);

// GET single store item (stok)
router.get("/:id/inventory/:itemId", inventoryController.getStoreItem);

// existing: list inventory
router.get("/:id/inventory", inventoryController.getInventory);


module.exports = router;
