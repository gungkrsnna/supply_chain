const { requestDetail } = require("../models");

module.exports = {
  async createRequestDetail(data) {
    return await requestDetail.create(data);
  },
  async getAllRequestDetails() {
    return await requestDetail.findAll();
  },
  async getRequestDetailById(id) {
    return await requestDetail.findOne({
      where: { id },
      include: [
        { model: user, as: "request" },
        { model: item, as: "item" },
      ],
    });
  },
  async updateRequest(id, data) {
    const requestDetail = await requestDetail.findByPk(id);
    if (!requestDetail) return null;
    return await requestDetail.update(data);
  },
  async deleteRequest(id) {
    const requestDetail = await requestDetail.findByPk(id);
    if (!requestDetail) return null;
    await requestDetail.destroy();
    return true;
  },

  async getInitiateData(store_id, request_category_id) {
    return await request.findAll({
      where: { store_id, request_category_id },
    });
  },
};
