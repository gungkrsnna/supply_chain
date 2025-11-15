// src/controllers/inventoryController.js
const service = require('../services/storeInventoryService');

exports.listStores = async (req, res) => {
  try {
    const rows = await service.listStores();
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listStores:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to list stores' });
  }
};

exports.getInventoryByStore = async (req, res) => {
  try {
    const storeId = req.params.id;
    if (!storeId) return res.status(400).json({ success: false, message: 'store id required' });
    const rows = await service.getInventoryForStore(storeId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getInventoryByStore:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to get inventory' });
  }
};

exports.createInventoryItem = async (req, res) => {
  try {
    const storeId = req.params.id;
    const payload = req.body;
    if (!storeId) return res.status(400).json({ success: false, message: 'store id required' });
    const created = await service.createInventoryItem(storeId, payload);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('createInventoryItem:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create inventory item' });
  }
};

exports.updateInventoryItem = async (req, res) => {
  try {
    const storeId = req.params.id;
    const itemId = req.params.itemId;
    const payload = req.body;
    if (!storeId || !itemId) return res.status(400).json({ success: false, message: 'store id and item id required' });
    const updated = await service.updateInventoryItem(storeId, itemId, payload);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateInventoryItem:', err);
    if (err.message === 'not_found') return res.status(404).json({ success: false, message: 'item not found' });
    return res.status(500).json({ success: false, message: err.message || 'Failed to update' });
  }
};

exports.deleteInventoryItem = async (req, res) => {
  try {
    const storeId = req.params.id;
    const itemId = req.params.itemId;
    if (!storeId || !itemId) return res.status(400).json({ success: false, message: 'store id and item id required' });
    await service.deleteInventoryItem(storeId, itemId);
    return res.json({ success: true, message: 'deleted' });
  } catch (err) {
    console.error('deleteInventoryItem:', err);
    if (err.message === 'not_found') return res.status(404).json({ success: false, message: 'item not found' });
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete' });
  }
};

/**
 * Bulk replace inventory (frontend sends { items: [...] })
 */
exports.bulkReplace = async (req, res) => {
  try {
    const storeId = req.params.id;
    const items = req.body.items || [];
    if (!storeId) return res.status(400).json({ success: false, message: 'store id required' });
    const rows = await service.bulkReplaceInventory(storeId, items);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('bulkReplace:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to bulk replace' });
  }
};
