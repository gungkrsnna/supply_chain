const kitchenService = require('../services/kitchenWorkflowService');

exports.createRun = async (req, res) => {
  try {
    const date = req.body.date || req.query.date;
    const createdBy = req.user ? req.user.id : null;
    if (!date) return res.status(400).json({ success:false, message:"date required" });
    const created = await kitchenService.createRunFromDate(date, createdBy);
    return res.status(201).json({ success:true, message:"Run created", data: created });
  } catch (err) {
    console.error('createRun:', err);
    return res.status(500).json({ success:false, message: err.message });
  }
};

exports.getRun = async (req, res) => {
  try {
    const idOrDate = req.params.id || req.query.date;
    if (!idOrDate) return res.status(400).json({ success:false, message:"id or date required" });
    const data = await kitchenService.getRun(idOrDate); // <-- PASTIKAN memanggil service
    if (!data) return res.status(404).json({ success:false, message:"Run not found" });
    return res.status(200).json({ success:true, data });
  } catch (err) {
    console.error('getRun:', err);
    return res.status(500).json({ success:false, message: err.message });
  }
};

exports.markStage = async (req, res) => {
  try {
    const id = req.params.id;
    const { stage } = req.body;
    if (!id || !stage) return res.status(400).json({ success:false, message:"id and stage required" });
    await kitchenService.markStageComplete(id, stage);
    return res.status(200).json({ success:true, message:"Stage updated" });
  } catch (err) {
    console.error('markStage:', err);
    return res.status(500).json({ success:false, message: err.message });
  }
};

exports.addQC = async (req, res) => {
  try {
    const id = req.params.id;
    const { stage, status, note } = req.body;
    const checked_by = req.user ? req.user.id : null;
    if (!id || !stage || !status) return res.status(400).json({ success:false, message:"id, stage, status required" });
    await kitchenService.addQC(id, stage, status, note, checked_by);
    return res.status(201).json({ success:true, message:"QC recorded" });
  } catch (err) {
    console.error('addQC:', err);
    return res.status(500).json({ success:false, message: err.message });
  }
};

exports.getRunQC = async (req, res) => {
  try {
    const runId = req.params.id;
    if (!runId) return res.status(400).json({ success: false, message: "id required" });
    const rows = await req.app.get('models').sequelize.query(
      "SELECT kq.*, u.name as checked_by_name FROM kitchen_qc kq LEFT JOIN users u ON u.id = kq.checked_by WHERE kitchen_run_id = ? ORDER BY checked_at DESC",
      { replacements: [runId], type: require('sequelize').QueryTypes.SELECT }
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('getRunQC:', err);
    return res.status(500).json({ success:false, message: err.message });
  }
};
