const requestService = require("../services/requestService");
const requestDetailService = require("../services/requestDetailService");
const deliveryOrderService = require("../services/deliveryOrderService");
const inventoryService = require("../services/inventoryService");

exports.createRequest = async (req, res) => {
  try {
    const user_id = req.user.id;
    const store_id = req.user.store_id;

    const { request_category_id, details, notes } = req.body;

    // Validasi input
    if (
      !request_category_id ||
      !details ||
      !Array.isArray(details) ||
      details.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "request_category_id and details are required",
        data: null,
      });
    }

    // Buat request utama
    const request = await requestService.createRequest({
      store_id,
      user_id,
      request_category_id,
      code: await generateUniqueCode(), // Generate unique code
      date: new Date(),
      notes: notes || null,
    });

    // Simpan detail request
    for (const detail of details) {
      if (!detail.item_id || !detail.quantity) {
        continue; // skip jika data detail tidak lengkap
      }
      await requestDetailService.createRequestDetail({
        request_id: request.id,
        item_id: detail.item_id,
        quantity: detail.quantity,
        notes: detail.notes || null,
      });
    }

    // Ambil data request beserta detail
    const data = await requestService.getRequestById(request.id);

    res.status(201).json({
      success: true,
      message: "Request created successfully",
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create request",
      data: null,
    });
  }
};

exports.getAllRequests = async (req, res) => {
  try {
    const requests = await requestService.getAllRequests();
    res.status(200).json({
      success: true,
      message: "Requests retrieved successfully",
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve requests",
      data: null,
    });
  }
};

exports.getRequestById = async (req, res) => {
  try {
    const request = await requestService.getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "Request retrieved successfully",
      data: request,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve request",
      data: null,
    });
  }
};

exports.updateRequest = async (req, res) => {
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

    const request = await requestService.updateRequest(req.params.id, {
      store_id,
      user_id,
      item_id,
      request_category_id,
      quantity,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Daily Production not found",
        data: null,
      });
    }

    const data = await requestService.getRequestById(request.id);

    res.status(200).json({
      success: true,
      message: "Daily Production updated successfully",
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update request",
      data: null,
    });
  }
};

exports.deleteRequest = async (req, res) => {
  try {
    const deleted = await requestService.deleteRequest(req.params.id);
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
      message: error.message || "Failed to delete request",
      data: null,
    });
  }
};

exports.getInitiateData = async (req, res) => {
  try {
    const store_id = req.user.store_id;
    const request_category_id = req.query.request_category_id;

    const initiateData = await requestService.getInitiateData(
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

exports.approveRequest = async (req, res) => {
  try {
    const user_id = req.user.id;
    const reqData = await requestService.getRequestById(req.params.id);

    if (!reqData) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
        data: null,
      });
    }

    if (reqData.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Request is not available for approval",
        data: null,
      });
    }

    const approvedRequest = await requestService.approveRequest(
      reqData.id,
      user_id
    );

    if (approvedRequest) {
      const code = await deliveryOrderService.deliveryOrderCount();

      await deliveryOrderService.createDeliveryOrder(approvedRequest.id, code);
    }

    res.status(200).json({
      success: true,
      message: "Request approved successfully",
      data: approvedRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve request",
      data: null,
    });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const user_id = req.user.id;

    const rejectedRequest = await requestService.rejectRequest(
      req.params.id,
      user_id
    );

    res.status(200).json({
      success: true,
      message: "Request rejected successfully",
      data: rejectedRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reject request",
      data: null,
    });
  }
};

async function generateUniqueCode() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const count = await requestService.requestCount(startOfDay, endOfDay);

  const sequence = String(count + 1).padStart(4, "0");
  const code = `REQ-${dateStr}-${sequence}`;

  return code;
}
