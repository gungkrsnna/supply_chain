// src/routes/kitchenRoutes.js
const express = require("express");
const router = express.Router();
const kitchenController = require("../controllers/kitchenController");

// GET /api/kitchen/calc?date=YYYY-MM-DD
router.get("/calc", kitchenController.getCalculation);

module.exports = router;
