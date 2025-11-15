// routes/storeRequestRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/storeRequestController");

// create new request (store requests items)
router.post("/", controller.createStoreRequest);

// list all (admin) - optional: protect with auth middleware
router.get("/", controller.listRequestsForStore); // or change to admin listing route

// list for a store
router.get("/store/:storeId", controller.listRequestsForStore);

// get one
router.get("/:id", controller.getRequest);

// update status
router.put("/:id/status", controller.updateRequestStatus);

module.exports = router;
