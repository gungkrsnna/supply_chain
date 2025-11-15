// src/routes/brandRoutes.js
const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brandController');
const itemController = require('../controllers/itemController');
const upload = require('../middlewares/uploadLogo'); // <-- pastikan path ini benar

// gunakan upload.single('logo') agar multer mem-proses field 'logo'
router.get('/', brandController.getBrands);
router.post('/', upload.single('logo'), brandController.createBrand);
router.get('/:id', brandController.getBrand);
router.put('/:id', upload.single('logo'), brandController.updateBrand);
router.delete('/:id', brandController.deleteBrand);

// router.get('/:id/items', brandController.getItems);
router.post('/:brandId/items/fg', itemController.createFgForBrand);
router.get('/:brandId/items', brandController.itemsForBrand);


module.exports = router;
