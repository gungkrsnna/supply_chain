// src/controllers/kitchenController.js
const kitchenService = require("../services/kitchenCalculationService");

exports.getCalculation = async (req, res) => {
  try {
    const date = req.query.date ?? null;
    if (!date) return res.status(400).json({ success:false, message:"date query required (YYYY-MM-DD)", data:null });
    const result = await kitchenService.calculateKitchenProduction(date);
    return res.status(200).json({ success: true, message: "Kitchen calculation", data: result });
  } catch (err) {
    console.error("getCalculation:", err);
    return res.status(500).json({ success:false, message: err.message || "Failed to calculate", data:null });
  }
};
