const uomService = require("../services/uomService");

exports.createUom = async (req, res) => {
  try {
    const uom = await uomService.createUom(req.body);
    res.status(201).json({
      success: true,
      message: "UOM created successfully",
      data: uom,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create UOM",
      data: null,
    });
  }
};

exports.getAllUoms = async (req, res) => {
  try {
    const uoms = await uomService.getAllUoms();
    res.status(200).json({
      success: true,
      message: "UOMs retrieved successfully",
      data: uoms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve UOMs",
      data: null,
    });
  }
};

exports.getUomById = async (req, res) => {
  try {
    const uom = await uomService.getUomById(req.params.id);

    if (!uom) {
      return res.status(404).json({
        success: false,
        message: "UOM not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "UOM retrieved successfully",
      data: uom,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve UOM",
      data: null,
    });
  }
};

exports.updateUom = async (req, res) => {
  try {
    const uom = await uomService.updateUom(req.params.id, req.body);
    if (!uom) {
      return res.status(404).json({
        success: false,
        message: "UOM not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "UOM updated successfully",
      data: uom,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update UOM",
      data: null,
    });
  }
};

exports.deleteUom = async (req, res) => {
  try {
    const deleted = await uomService.deleteUom(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "UOM not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "UOM deleted successfully",
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete UOM",
      data: null,
    });
  }
};
