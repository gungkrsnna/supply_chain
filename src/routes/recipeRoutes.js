// src/routes/recipeRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/recipeController');

router.post('/', controller.create);
router.get('/item/:itemId', controller.listForItem);
router.get('/brand/:brandId', controller.listForBrand);   // <-- NEW
router.get('/:id', controller.getDetail);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/activate', controller.activate);
router.get('/:id/flatten', controller.flatten);

module.exports = router;
