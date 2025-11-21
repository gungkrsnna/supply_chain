const productionTargetService = require('../services/productionTargetService');

async function bulkCreate(req, res) {
  try {
    const payload = req.body;
    const result = await productionTargetService.createBulkProductionTarget(payload);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { bulkCreate };
