// routes/centralItems.js
const express = require("express");
const router = express.Router();
const centralCtrl = require("../controllers/centralItemController");

// list central items for a central kitchen (GET /api/central/:centralId/items)
router.get("/:centralId/items", centralCtrl.listCentralItems);

// get single
router.get("/:centralId/items/:itemId", centralCtrl.getCentralItem);

// adjust stock (POST /api/central/:centralId/items/adjust)
router.post("/:centralId/items/adjust", centralCtrl.adjustCentralStock);

// transfer to store (POST /api/central/:centralId/transfer-to-store)
router.post("/:centralId/transfer-to-store", centralCtrl.transferToStore);

module.exports = router;
