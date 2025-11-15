const express = require('express');
const router = express.Router();
const controller = require('../controllers/itemComponentController');

// CRUD for item_components
router.post('/', controller.create);            // create component relation
router.put('/:id', controller.update);          // update relation
router.delete('/:id', controller.remove);       // delete relation

// queries
router.get('/fg/:fgId/components', controller.listForFG);              // list one-level components
router.get('/component/:componentId/fgs', controller.listFGsUsingComponent); // list fgs using component
router.get('/fg/:fgId/bom/recursive', controller.recursiveBom);       // recursive bom
router.get('/fg/:fgId/contains/:componentId', controller.containsComponent); // exists?

module.exports = router;
