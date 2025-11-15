// src/routes/kitchenWorkflowRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/kitchenWorkflowController");

// create run (generate calc + persist)
router.post("/runs", controller.createRun);

// get run by id: /api/kitchen/runs/:id
router.get("/runs/:id", controller.getRun);

// or get by date: /api/kitchen/runs?date=YYYY-MM-DD
router.get("/runs", controller.getRun);

// mark stage complete
router.put("/runs/:id/stage", controller.markStage);

// add qc
router.post("/runs/:id/qc", controller.addQC);

// GET /api/kitchen/runs/:id/qc
router.get("/runs/:id/qc", controller.getRunQC);


module.exports = router;
