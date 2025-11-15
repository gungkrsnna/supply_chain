const { DailyProduction, Store, User, Item } = require("../models");

module.exports = {
  async createDailyProduction(data) {
    return await DailyProduction.create(data);
  },
  async getAllDailyProductions() {
    return await DailyProduction.findAll();
  },
  async getDailyProductionById(id) {
    return await DailyProduction.findOne({
      where: { id },
      include: [
        { model: Store, as: "store" },
        { model: User, as: "user" },
        { model: Item, as: "item" },
      ],
    });
  },
  async updateDailyProduction(id, data) {
    const dp = await DailyProduction.findByPk(id);
    if (!dp) return null;
    return await dp.update(data);
  },
  async deleteDailyProduction(id) {
    const dp = await DailyProduction.findByPk(id);
    if (!dp) return null;
    await dp.destroy();
    return true;
  },
  async getInitiateData(store_id, request_category_id) {
    return await DailyProduction.findAll({
      where: { store_id, request_category_id },
    });
  },
};
