const categoryItemService = require("../services/categoryitemService");

exports.createCategoryItem = async (req, res) => {
  try {
    const categoryItem = await categoryItemService.createCategoryItem(req.body);
    res.status(201).json({
      success: true,
      message: "Category item created successfully",
      data: categoryItem,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create category item",
      data: null,
    });
  }
};

exports.getAllCategoryItems = async (req, res) => {
  try {
    const categoryItems = await categoryItemService.getAllCategoryItems();
    res.status(200).json({
      success: true,
      message: "Category items retrieved successfully",
      data: categoryItems,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve category items",
      data: null,
    });
  }
};

exports.getCategoryItemById = async (req, res) => {
  try {
    const categoryItem = await categoryItemService.getCategoryItemById(
      req.params.id
    );
    if (!categoryItem) {
      return res.status(404).json({
        success: false,
        message: "Category item not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "Category item retrieved successfully",
      data: categoryItem,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve category item",
      data: null,
    });
  }
};

exports.updateCategoryItem = async (req, res) => {
  try {
    const categoryItem = await categoryItemService.updateCategoryItem(
      req.params.id,
      req.body
    );
    if (!categoryItem) {
      return res.status(404).json({
        success: false,
        message: "Category item not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "Category item updated successfully",
      data: categoryItem,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update category item",
      data: null,
    });
  }
};

exports.deleteCategoryItem = async (req, res) => {
  try {
    const deleted = await categoryItemService.deleteCategoryItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Category item not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "Category item deleted successfully",
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete category item",
      data: null,
    });
  }
};
