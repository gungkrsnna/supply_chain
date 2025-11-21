const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");


router.get("/brands", adminController.listBrands); // <-- this one returns brands
router.get('/brands/:brandId/requests', adminController.listRequestsForBrand);

module.exports = router;