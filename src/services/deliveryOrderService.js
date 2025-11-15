const { Op } = require("sequelize");
const { deliveryOrder } = require("../models");

module.exports = {
  async createDeliveryOrder(request_id, code) {
    return await deliveryOrder.create({
      request_id: request_id,
      code: code,
      status: "pending",
    });
  },
  async getAllDeliveryOrders() {
    return await deliveryOrder.findAll();
  },
  async getDeliveryOrderById(id) {
    return await deliveryOrder.findOne({
      where: { id },
      // include: [{ model: request, as: "request" }],
    });
  },
  async updateDeliveryOrder(id, data) {
    const deliveryOrder = await deliveryOrder.findByPk(id);
    if (!deliveryOrder) return null;
    return await deliveryOrder.update(data);
  },
  async deleteDeliveryOrder(id) {
    const deliveryOrder = await deliveryOrder.findByPk(id);
    if (!deliveryOrder) return null;
    await deliveryOrder.destroy();
    return true;
  },

  async approveDeliveryOrder(id, user_id, status) {
    const doData = await deliveryOrder.findByPk(id);
    if (!doData) return null;

    if (status == "delivered") {
      const data = await doData.update({
        status: status,
        delivered_date: new Date(),
      });
      return data;
    }

    if (status == "arrived") {
      const data = await doData.update({
        status: status,
        arrived_date: new Date(),
      });
      return data;
    }
  },

  async deliveryOrderCount() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await deliveryOrder.count({
      where: {
        createdAt: {
          [Op.between]: [startOfDay, endOfDay],
        },
      },
    });

    const sequence = String(count + 1).padStart(4, "0");
    const code = `DO-${dateStr}-${sequence}`;

    return code;
  },
};
