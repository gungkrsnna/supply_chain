const deliveryOrderService = require("../services/deliveryOrderService");
const inventoryService = require("../services/inventoryService");
const requestService = require("../services/requestService");

exports.createDeliveryOrder = async (req, res) => {
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

    const deliveryOrder = await deliveryOrderService.createDeliveryOrder({
      store_id,
      user_id,
      item_id,
      request_category_id,
      quantity,
    });

    const data = await deliveryOrderService.getDeliveryOrderById(
      deliveryOrder.id
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

exports.getAllDeliveryOrders = async (req, res) => {
  try {
    const deliveryOrders = await deliveryOrderService.getAllDeliveryOrders();
    res.status(200).json({
      success: true,
      message: "Daily productions retrieved successfully",
      data: deliveryOrders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve daily productions",
      data: null,
    });
  }
};

exports.getDeliveryOrderById = async (req, res) => {
  try {
    const deliveryOrder = await deliveryOrderService.getDeliveryOrderById(
      req.params.id
    );
    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: "Daily production not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "Daily production retrieved successfully",
      data: deliveryOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve daily production",
      data: null,
    });
  }
};

exports.updateDeliveryOrder = async (req, res) => {
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

    const deliveryOrder = await deliveryOrderService.updateDeliveryOrder(
      req.params.id,
      { store_id, user_id, item_id, request_category_id, quantity }
    );

    if (!deliveryOrder) {
      return res.status(404).json({
        success: false,
        message: "Daily Production not found",
        data: null,
      });
    }

    const data = await deliveryOrderService.getDeliveryOrderById(
      deliveryOrder.id
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

exports.deleteDeliveryOrder = async (req, res) => {
  try {
    const deleted = await deliveryOrderService.deleteDeliveryOrder(
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

exports.approveDeliveryOrder = async (req, res) => {
  try {
    const user_id = req.user.id;
    const doData = await deliveryOrderService.getDeliveryOrderById(
      req.params.id
    );

    if (!doData) {
      return res.status(404).json({
        success: false,
        message: "Delivery order not found",
        data: null,
      });
    }

    let status = req.body.status;
    if (status == "dlv") {
      if (doData.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Delivery order is not available for approval",
          data: null,
        });
      }

      status = "delivered";
    } else if (status == "rjt") {
      status = "rejected";
    } else if (status == "arv") {
      status = "arrived";
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
        data: null,
      });
    }

    const approvedDeliveryOrder =
      await deliveryOrderService.approveDeliveryOrder(
        doData.id,
        user_id,
        status,
        req.body.note || null
      );

    if (status == "arv") {
      const arvData = await requestService.getRequestById(doData.request_id);
      // Update stock if arrived
      await inventoryService.updateStockOnArrival(
        arvData.request_details,
        arvData.store_id
      );
    }

    res.status(200).json({
      success: true,
      message: "Delivery order approved successfully",
      data: approvedDeliveryOrder,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve delivery order",
      data: null,
    });
  }
};
