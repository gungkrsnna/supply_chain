const dailyProductionService = require("../services/dailyProductionService");
const inventoryService = require("../services/inventoryService");

exports.createDailyProduction = async (req, res) => {
  try {
    const user_id = req.user.id;

    const { store_id, item_id, request_category_id, quantity, date } = req.body;

    if (!store_id || !item_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: "store_id, item_id, and quantity are required",
        data: null,
      });
    }

    const dailyProduction = await dailyProductionService.createDailyProduction({
      store_id,
      user_id,
      item_id,
      request_category_id,
      quantity,
      date,
    });

    const data = await dailyProductionService.getDailyProductionById(
      dailyProduction.id
    );
    res.status(201).json({
      success: true,
      message: "Daily production created successfully",
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create daily production",
      data: null,
    });
  }
};

exports.getAllDailyProductions = async (req, res) => {
  try {
    const dailyProductions =
      await dailyProductionService.getAllDailyProductions();
    res.status(200).json({
      success: true,
      message: "Daily productions retrieved successfully",
      data: dailyProductions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve daily productions",
      data: null,
    });
  }
};

exports.getDailyProductionById = async (req, res) => {
  try {
    const dailyProduction = await dailyProductionService.getDailyProductionById(
      req.params.id
    );
    if (!dailyProduction) {
      return res.status(404).json({
        success: false,
        message: "Daily production not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "Daily production retrieved successfully",
      data: dailyProduction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve daily production",
      data: null,
    });
  }
};

exports.updateDailyProduction = async (req, res) => {
  try {
    const user_id = req.user.id;

    const { store_id, item_id, request_category_id, quantity } = req.body;

    if (!store_id || !item_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: "store_id, item_id, and quantity are required",
        data: null,
      });
    }

    const dailyProduction = await dailyProductionService.updateDailyProduction(
      req.params.id,
      { store_id, user_id, item_id, request_category_id, quantity }
    );

    if (!dailyProduction) {
      return res.status(404).json({
        success: false,
        message: "Daily Production not found",
        data: null,
      });
    }

    const data = await dailyProductionService.getDailyProductionById(
      dailyProduction.id
    );

    res.status(200).json({
      success: true,
      message: "Daily Production updated successfully",
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update daily production",
      data: null,
    });
  }
};

exports.deleteDailyProduction = async (req, res) => {
  try {
    const deleted = await dailyProductionService.deleteDailyProduction(
      req.params.id
    );
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Daily Production not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "Daily Production deleted successfully",
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete daily production",
      data: null,
    });
  }
};

exports.getInitiateData = async (req, res) => {
  try {
    const store_id = req.user.store_id;
    const request_category_id = req.query.request_category_id;

    const initiateData = await dailyProductionService.getInitiateData(
      store_id,
      request_category_id
    );

    await Promise.all(
      initiateData.map(async (element) => {
        const inventory = await inventoryService.getInventoryByItemId(
          element.item_id
        );

        element.dataValues.quantity =
          element.quantity - (inventory ? inventory.quantity : 0);
      })
    );

    res.status(200).json({
      success: true,
      message: "Initiate data retrieved successfully",
      data: initiateData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve initiate data",
      data: null,
    });
  }
};
