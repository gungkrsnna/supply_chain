// routes/storeRequestRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/storeRequestController");
const adminController = require("../controllers/adminController");

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

router.post('/bulk-approve', controller.bulkApproveRequests); // approve many
router.post('/print-delivery', controller.printDeliveryNote); 
// brand selection
router.get('/brands', adminController.listBrands); // GET /api/admin/brands
router.get('/brands/:brandId/requests', controller.listRequestsByBrand); // GET /api/admin/brands/:brandId/requests

module.exports = router;
