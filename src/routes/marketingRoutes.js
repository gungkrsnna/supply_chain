const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/marketingController');

router.get('/runs/ready', ctrl.listReadyRuns); // ?date=YYYY-MM-DD optional
router.post('/delivery', ctrl.createDelivery); // body: { kitchen_run_id, destination_store_id }
router.get('/delivery/:id', ctrl.getDelivery);
router.post('/delivery/:id/print', ctrl.printDelivery);

module.exports = router;
