// src/routes/storeInventoryRoutes.js
const express = require('express');
const router = express.Router();

let inventoryController = null;
try {
  inventoryController = require('../controllers/inventoryController');
  if (inventoryController && inventoryController.default)
    inventoryController = inventoryController.default;
} catch (err) {
  console.error('Failed to require controllers/inventoryController:', err);
  inventoryController = null;
}

const service = require('../services/storeInventoryService');

// helper agar route tidak crash jika handler undefined
function ensureFn(fn, name) {
  if (typeof fn === 'function') {
    return fn.bind(inventoryController);
  }
  return (req, res) => {
    console.error(
      `Route handler "${name}" is not available or not a function. Check controllers/inventoryController exports.`
    );
    res
      .status(500)
      .json({ success: false, message: `Server misconfigured: handler ${name} not found` });
  };
}

/* ------------------------------
 * ✅ Tambahkan route untuk daftar store
 * GET /api/stores
 * ------------------------------ */
router.get('/', async (req, res) => {
  try {
    const rows = await service.listStores();
    const data = (rows || []).map((r) =>
      typeof r.toJSON === 'function' ? r.toJSON() : r
    );
    return res.json(data);
  } catch (err) {
    console.error('listStores error:', err);
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to load stores' });
  }
});

/* ------------------------------
 * ✅ Inventory routes per store
 * ------------------------------ */
router.get(
  '/:id/inventory',
  ensureFn(
    inventoryController && inventoryController.getInventoryByStore,
    'getInventoryByStore'
  )
);

router.post(
  '/:id/inventory',
  ensureFn(inventoryController && inventoryController.bulkReplace, 'bulkReplace')
);

router.post(
  '/:id/inventory/item',
  ensureFn(
    inventoryController && inventoryController.createInventoryItem,
    'createInventoryItem'
  )
);

router.put(
  '/:id/inventory/:itemId',
  ensureFn(
    inventoryController && inventoryController.updateInventoryItem,
    'updateInventoryItem'
  )
);

router.delete(
  '/:id/inventory/:itemId',
  ensureFn(
    inventoryController && inventoryController.deleteInventoryItem,
    'deleteInventoryItem'
  )
);

module.exports = router;
