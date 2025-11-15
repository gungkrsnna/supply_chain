// src/routes/productionOrderRoutes.js
const express = require("express");
const router = express.Router();
const productionOrderController = require("../controllers/productionOrderController");

// existing routes...
router.get("/", productionOrderController.getProductionOrders);
router.post("/", productionOrderController.createProductionOrder);
router.put("/:id", productionOrderController.updateProductionOrder);
router.delete("/:id", productionOrderController.deleteProductionOrder);

// aggregation: totals by item
router.get("/totals/items", productionOrderController.getTotalsByItem);

// existing totals/store endpoints (jika tetap dipakai)
router.get("/totals", productionOrderController.getTotals);
router.get("/totals/:storeId/breakdown", productionOrderController.getBreakdownByStore);

module.exports = router;
