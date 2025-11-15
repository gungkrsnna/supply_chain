const express = require('express');
const uomController = require('../controllers/uomController');
const router = express.Router();

router.post('/', uomController.createUom);
router.get('/', uomController.getAllUoms);
router.get('/:id', uomController.getUomById);
router.put('/:id', uomController.updateUom);
router.delete('/:id', uomController.deleteUom);

module.exports = router;
