// src/controllers/recipeController.js
const RecipeService = require('../services/recipeService');
const db = require('../models');          // <-- pastikan models/index.js tersedia
const { Op } = require('sequelize');

module.exports = {
  async create(req, res) {
    try {
      const recipe = await RecipeService.createRecipe(req.body);
      return res.json({ success: true, data: recipe });
    } catch (err) {
      console.error(err);
      return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
    }
  },

  async update(req, res) {
    try {
      const id = req.params.id;
      const recipe = await RecipeService.updateRecipe(id, req.body);
      return res.json({ success: true, data: recipe });
    } catch (err) {
      console.error(err);
      return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
    }
  },

  async remove(req, res) {
    try {
      await RecipeService.deleteRecipe(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
    }
  },

  async getDetail(req, res) {
    try {
      const rec = await RecipeService.getRecipeDetail(req.params.id);
      if (!rec) return res.status(404).json({ success: false, message: 'Recipe not found' });
      return res.json({ success: true, data: rec });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
  },

  async listForItem(req, res) {
    try {
      const list = await RecipeService.listRecipesForItem(req.params.itemId);
      return res.json({ success: true, data: list });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  async activate(req, res) {
    try {
      await RecipeService.activateRecipe(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
    }
  },

  async flatten(req, res) {
    try {
      const data = await RecipeService.flattenRecipe(req.params.id);
      return res.json({ success: true, data });
    } catch (err) {
      console.error(err);
      return res.status(400).json({ success: false, message: err.message || 'Error flattening recipe' });
    }
  },

  async listForBrand(req, res) {
    const brandId = req.params.brandId;
    try {
      if (!brandId) return res.status(400).json({ success: false, message: 'brandId required' });

      const recipes = await RecipeService.listRecipesForBrand(brandId);
      return res.json({ success: true, data: recipes });
    } catch (err) {
      console.error('listForBrand error', err);
      return res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
    }
  }
};
