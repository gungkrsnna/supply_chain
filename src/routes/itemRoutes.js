const express = require('express');
const itemController = require('../controllers/itemController');
const storeItemController = require('../controllers/storeItemController');
// tambahkan import upload middleware
const { upload } = require('../middlewares/upload');

const router = express.Router();

// create / list / search
router.post('/', itemController.createItem);
router.get('/', itemController.listItems);          // lebih konsisten: index route dulu
router.get('/search', itemController.listItems);

// store-specific
router.get('/:storeId/items', storeItemController.listItemsByStore);

// image routes (letakkan sebelum generic :id routes untuk menghindari ambiguitas)
router.post('/:id/image', upload.single('image'), itemController.uploadItemImage);
router.delete('/:id/image', itemController.deleteItemImage);

// item-specific
router.get('/:id/measurements', itemController.getMeasurementsByItem);
router.get('/:id', itemController.getItemById);
router.put('/:id', itemController.updateItem);
router.delete('/:id', itemController.deleteItem);

module.exports = router;
