const db = require('../models');
const itemService = require('../services/itemService'); // sudah ada
const ItemComponent = db.ItemComponent;
const { CATEGORY_SFG, UOM_PCS_ID } = require('../config/constants');

module.exports = {
  // create SFG (brand-aware optional)
  async createSfg(req, res) {
    try {
      const { name, description, brandId, code } = req.body;
      if (!name) return res.status(400).json({ success:false, message: 'name required' });

      const payload = {
        name,
        description: description || null,
        category_item_id: CATEGORY_SFG,
        uom_id: UOM_PCS_ID,
        is_production: true,
        code: code || null
      };

      // if API used under /api/brands/:brandId/items/fg you can accept brandId param
      if (req.params && req.params.brandId) payload.code = payload.code || undefined;

      const item = await itemService.createItem(payload);
      const data = await itemService.getItemById(item.id);
      return res.status(201).json({ success:true, data });
    } catch (err) {
      console.error('createSfg', err);
      return res.status(500).json({ success:false, message: err.message });
    }
  },

  async getAllSfg(req, res) {
    try {
      const brandId = req.query.brand_id ? Number(req.query.brand_id) : null;
      // basic: load all items where category_item_id = CATEGORY_SFG
      const where = { category_item_id: CATEGORY_SFG };
      if (brandId) where.brand_id = brandId;

      const rows = await db.Item.findAll({
        where,
        order: [['name','ASC']],
        include: [{ model: db.Uom, as: 'uom', required: false }]
      });
      return res.json({ success:true, data: rows });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success:false, message: err.message });
    }
  },

  async getSfgById(req, res) {
    try {
      const id = Number(req.params.id);
      const item = await itemService.getItemById(id);
      if (!item) return res.status(404).json({ success:false, message:'SFG not found' });
      return res.json({ success:true, data: item });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success:false, message: err.message });
    }
  },

  async updateSfg(req, res) {
    try {
      const id = Number(req.params.id);
      const { name, description } = req.body;
      const updated = await itemService.updateItem(id, { name, description });
      if (!updated) return res.status(404).json({ success:false, message:'SFG not found' });
      const data = await itemService.getItemById(id);
      return res.json({ success:true, data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success:false, message: err.message });
    }
  },

  async deleteSfg(req, res) {
    try {
      const id = Number(req.params.id);
      const deleted = await itemService.deleteItem(id);
      if (!deleted) return res.status(404).json({ success:false, message:'SFG not found' });
      return res.json({ success:true, message:'SFG deleted' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success:false, message: err.message });
    }
  },

  // recipe endpoints ------------------------------------------------
  async getRecipe(req, res) {
    try {
      const sfgId = Number(req.params.id);
      const comps = await ItemComponent.findAll({
        where: { fg_item_id: sfgId },
        include: [{ model: db.Item, as: 'componentItem' }]
      });
      return res.json({ success:true, data: comps });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success:false, message: err.message });
    }
  },

  async addRecipeComponent(req, res) {
    try {
      const sfgId = Number(req.params.id);
      const { component_item_id, quantity, uom_id, is_optional } = req.body;
      if (!component_item_id || !quantity) {
        return res.status(400).json({ success:false, message:'component_item_id and quantity required' });
      }
      // optionally validate component_item exists and category = RM
      const item = await db.Item.findByPk(component_item_id);
      if (!item) return res.status(400).json({ success:false, message:'component item not found' });

      const created = await ItemComponent.create({
        fg_item_id: sfgId,
        component_item_id,
        quantity,
        uom_id: uom_id || UOM_PCS_ID,
        is_optional: !!is_optional
      });
      const data = await db.ItemComponent.findOne({
        where: { id: created.id },
        include: [{ model: db.Item, as: 'componentItem' }]
      });
      return res.status(201).json({ success:true, data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success:false, message: err.message });
    }
  },

  async updateRecipeComponent(req, res) {
    try {
      const compId = Number(req.params.compId);
      const comp = await ItemComponent.findByPk(compId);
      if (!comp) return res.status(404).json({ success:false, message:'component not found' });
      const { quantity, uom_id, is_optional } = req.body;
      await comp.update({ quantity, uom_id, is_optional });
      const data = await ItemComponent.findOne({ where:{id:compId}, include:[{model:db.Item, as:'componentItem'}]});
      return res.json({ success:true, data });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success:false, message: err.message });
    }
  },

  async deleteRecipeComponent(req, res) {
    try {
      const compId = Number(req.params.compId);
      const comp = await ItemComponent.findByPk(compId);
      if (!comp) return res.status(404).json({ success:false, message:'component not found' });
      await comp.destroy();
      return res.json({ success:true, message:'component deleted' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success:false, message: err.message });
    }
  }
};
