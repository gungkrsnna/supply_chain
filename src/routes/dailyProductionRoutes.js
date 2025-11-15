const express = require("express");
const dailyProductionController = require("../controllers/dailyProductionController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.use(authMiddleware);
router.post("/", dailyProductionController.createDailyProduction);
router.get("/", dailyProductionController.getAllDailyProductions);
router.get("/initiate", dailyProductionController.getInitiateData);
router.get("/:id", dailyProductionController.getDailyProductionById);
router.put("/:id", dailyProductionController.updateDailyProduction);
router.delete("/:id", dailyProductionController.deleteDailyProduction);

module.exports = router;
