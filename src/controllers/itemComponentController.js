const { sequelize, Item, ItemComponent } = require('../models');
const { QueryTypes } = require('sequelize');

module.exports = {
  // create relation (add component to FG)
  async create(req, res) {
    try {
      const { fg_item_id, component_item_id, quantity = 1, uom_id = null, is_optional = false } = req.body;
      // basic validation
      if (!fg_item_id || !component_item_id) return res.status(400).json({ message: 'fg_item_id & component_item_id required' });
      if (fg_item_id === component_item_id) return res.status(400).json({ message: 'fg_item_id cannot equal component_item_id' });

      // optional: cek item exists
      const fg = await Item.findByPk(fg_item_id);
      const comp = await Item.findByPk(component_item_id);
      if (!fg || !comp) return res.status(404).json({ message: 'FG or Component item not found' });

      // create
      const created = await ItemComponent.create({ fg_item_id, component_item_id, quantity, uom_id, is_optional });
      return res.status(201).json(created);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // update relation
  async update(req, res) {
    try {
      const id = req.params.id;
      const record = await ItemComponent.findByPk(id);
      if (!record) return res.status(404).json({ message: 'Not found' });

      const { quantity, uom_id, is_optional } = req.body;
      await record.update({ quantity, uom_id, is_optional });
      return res.json(record);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  },

  // delete relation
  async remove(req, res) {
    try {
      const id = req.params.id;
      const record = await ItemComponent.findByPk(id);
      if (!record) return res.status(404).json({ message: 'Not found' });
      await record.destroy();
      return res.json({ message: 'Deleted' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  },

  // list components for a FG (one level)
  async listForFG(req, res) {
    try {
      const fgId = req.params.fgId;
      const rows = await ItemComponent.findAll({
        where: { fg_item_id: fgId },
        include: [{ model: Item, as: 'componentItem', attributes: ['id','code','name'] }]
      });
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  },

  // list FG that use a SFG (direct)
  async listFGsUsingComponent(req, res) {
    try {
      const componentId = req.params.componentId;
      const rows = await ItemComponent.findAll({
        where: { component_item_id: componentId },
        include: [{ model: Item, as: 'fgItem', attributes: ['id','code','name'] }]
      });
      return res.json(rows.map(r => r.fgItem));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  },

  // recursive BOM: get all components transitively for a FG (raw SQL recursive CTE)
  async recursiveBom(req, res) {
    try {
      const fgId = parseInt(req.params.fgId, 10);
      const sql = `
      WITH RECURSIVE bom AS (
        SELECT fg_item_id, component_item_id, quantity, 1 AS level
        FROM item_components
        WHERE fg_item_id = :fgId
        UNION ALL
        SELECT ic.fg_item_id, ic.component_item_id, bom.quantity * ic.quantity AS quantity, bom.level + 1 AS level
        FROM item_components ic
        JOIN bom ON ic.fg_item_id = bom.component_item_id
      )
      SELECT bom.*, i.code, i.name
      FROM bom
      JOIN items i ON i.id = bom.component_item_id
      ORDER BY bom.level;
      `;

      const rows = await sequelize.query(sql, {
        replacements: { fgId },
        type: QueryTypes.SELECT
      });

      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  },

  // check if FG contains a particular SFG (exists)
  async containsComponent(req, res) {
    try {
      const fgId = parseInt(req.params.fgId,10);
      const targetId = parseInt(req.params.componentId,10);
      const sql = `
      WITH RECURSIVE bom AS (
        SELECT component_item_id, fg_item_id FROM item_components WHERE fg_item_id = :fgId
        UNION ALL
        SELECT ic.component_item_id, ic.fg_item_id FROM item_components ic JOIN bom ON ic.fg_item_id = bom.component_item_id
      )
      SELECT EXISTS(SELECT 1 FROM bom WHERE component_item_id = :targetId) AS has_component;
      `;
      const [result] = await sequelize.query(sql, { replacements: { fgId, targetId }, type: QueryTypes.SELECT });
      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
};
