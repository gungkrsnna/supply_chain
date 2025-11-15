const kitchenService = require('../services/kitchenWorkflowService');
const models = require('../models');
const { Sequelize } = require('sequelize');

exports.listReadyRuns = async (req, res) => {
  try {
    const date = req.query.date || null;
    // find kitchen_runs with status indicating QC passed (we used 'qc_passed' earlier)
    const where = {};
    if (date) where.date = date;
    where.status = 'qc_passed';

    const runs = await models.KitchenRun.findAll({ where, order: [['date','ASC']] });
    return res.json({ success: true, data: runs.map(r => (r.get ? r.get({ plain: true }) : r)) });
  } catch (err) {
    console.error('listReadyRuns:', err);
    return res.status(500).json({ success:false, message: err.message });
  }
};

exports.createDelivery = async (req, res) => {
  try {
    const { kitchen_run_id, destination_store_id } = req.body;
    if (!kitchen_run_id) return res.status(400).json({ success:false, message: 'kitchen_run_id required' });

    // get run items
    const runData = await kitchenService.getRun(kitchen_run_id);
    if (!runData) return res.status(404).json({ success:false, message: 'run not found' });

    // create DO
    const doInstance = await models.DeliveryOrder.create({
      kitchen_run_id,
      destination_store_id: destination_store_id || null,
      status: 'draft',
      created_by: req.user ? req.user.id : null,
    });

    // create items from run.items (total_jumlah_produksi)
    const items = runData.items || [];
    for (const it of items) {
      await models.DeliveryOrderItem.create({
        delivery_order_id: doInstance.id,
        item_id: it.item_id,
        item_name: it.item_name || null,
        qty: it.total_jumlah_produksi || it.target_production || 0,
      });
    }

    // generate nomor surat jalan (simple): DO-{YYYYMMDD}-{id}
    const no = `DO-${(new Date()).toISOString().slice(0,10).replace(/-/g,'')}-${doInstance.id}`;
    await doInstance.update({ no_surat_jalan: no });

    return res.status(201).json({ success:true, data: { id: doInstance.id, no_surat_jalan: no } });
  } catch (err) {
    console.error('createDelivery:', err);
    return res.status(500).json({ success:false, message: err.message });
  }
};

exports.getDelivery = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await models.DeliveryOrder.findByPk(id, { include: [{ association: models.DeliveryOrder.associations.items }] });
    if (!row) return res.status(404).json({ success:false, message:'Not found' });
    return res.json({ success:true, data: row.get({ plain:true }) });
  } catch (err) {
    console.error('getDelivery:', err);
    return res.status(500).json({ success:false, message: err.message });
  }
};

exports.printDelivery = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const doRow = await models.DeliveryOrder.findByPk(id);
    if (!doRow) return res.status(404).json({ success:false, message:'Not found' });

    // set printed_at and status
    await doRow.update({ status: 'printed', printed_at: Sequelize.literal('CURRENT_TIMESTAMP') });

    // return full delivery for printing
    const full = await models.DeliveryOrder.findByPk(id, { include: [{ association: models.DeliveryOrder.associations.items }, { association: models.DeliveryOrder.associations.run }] });
    return res.json({ success:true, data: full.get({ plain:true }) });
  } catch (err) {
    console.error('printDelivery:', err);
    return res.status(500).json({ success:false, message: err.message });
  }
};
