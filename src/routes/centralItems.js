// routes/centralItems.js  (update)
const express = require("express");
const router = express.Router();
const centralCtrl = require("../controllers/centralItemController");

// existing...
router.get("/:centralId/items", centralCtrl.listCentralItems);
router.get("/:centralId/items/:itemId", centralCtrl.getCentralItem);
router.post("/:centralId/items/adjust", centralCtrl.adjustCentralStock);
router.post("/:centralId/transfer-to-store", centralCtrl.transferToStore);
// POST /api/central/:centralId/transactions
router.post("/:centralId/transactions", centralCtrl.createCentralTransaction);


// NEW: return central/store info used by frontend fetchCentralById
router.get("/:centralId", centralCtrl.getCentral);

module.exports = router;
