const express = require('express');
const itemController = require('../controllers/itemController');
const storeItemController = require('../controllers/storeItemController');
const router = express.Router();

router.post('/', itemController.createItem);
router.get('/', itemController.listItems);

router.get('/:id/measurements', itemController.getMeasurementsByItem);

router.get('/:id', itemController.getItemById);
router.put('/:id', itemController.updateItem);
router.delete('/:id', itemController.deleteItem);
router.get("/", itemController.listItems);

router.get('/:storeId/items', storeItemController.listItemsByStore);

module.exports = router;
