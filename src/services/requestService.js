const { Op } = require("sequelize");
const {
  request,
  requestCategory,
  requestDetail,
  store,
  user,
} = require("../models");

module.exports = {
  async createRequest(data) {
    return await request.create(data);
  },
  async getAllRequests() {
    return await request.findAll();
  },
  async getRequestById(id) {
    return await request.findOne({
      where: { id },
      include: [
        { model: requestCategory, as: "request_category" },
        { model: requestDetail, as: "request_details" },
        { model: store, as: "store" },
        { model: user, as: "user" },
      ],
    });
  },
  async updateRequest(id, data) {
    const request = await request.findByPk(id);
    if (!request) return null;
    return await request.update(data);
  },
  async deleteRequest(id) {
    const request = await request.findByPk(id);
    if (!request) return null;
    await request.destroy();
    return true;
  },

  async getInitiateData(store_id, request_category_id) {
    return await request.findAll({
      where: { store_id, request_category_id },
    });
  },

  async approveRequest(id, user_id) {
    const reqData = await request.findByPk(id);
    if (!reqData) return null;
    return await reqData.update({
      status: "approved",
      approved_by: user_id,
      approved_date: new Date(),
    });
  },

  async rejectRequest(id, user_id) {
    const reqData = await reqData.findByPk(id);
    if (!reqData) return null;
    return await reqData.update({
      status: "rejected",
      // approved_by: user_id,
      // approved_date: new Date(),
    });
  },

  async requestCount(start_date, end_date) {
    return await request.count({
      where: {
        date: {
          [Op.between]: [start_date, end_date],
        },
      },
    });
  },
};
