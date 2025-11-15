// src/routes/sfgRoutes.js
const express = require('express');
const sfgController = require('../controllers/sfgController');
const router = express.Router();

// CRUD SFG (create/list/get/update/delete)
router.post('/', sfgController.createSfg);
router.get('/', sfgController.getAllSfg); // optional: accept ?brand_id=...
router.get('/:id', sfgController.getSfgById);
router.put('/:id', sfgController.updateSfg);
router.delete('/:id', sfgController.deleteSfg);

// Recipe management for SFG (components = RM)
router.get('/:id/recipe', sfgController.getRecipe); // list components for sfg
router.post('/:id/recipe', sfgController.addRecipeComponent);
router.put('/recipe/:compId', sfgController.updateRecipeComponent);
router.delete('/recipe/:compId', sfgController.deleteRecipeComponent);

module.exports = router;
