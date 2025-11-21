const express = require('express');
const router = express.Router();
const productionTargetController = require('../controllers/productionTargetController');

router.post('/api/production-targets/bulk', productionTargetController.bulkCreate);

module.exports = router;
