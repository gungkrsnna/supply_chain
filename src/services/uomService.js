const { Uom } = require("../models");

module.exports = {
  async createUom(data) {
    return await Uom.create(data);
  },
  async getAllUoms() {
    return await Uom.findAll();
  },
  async getUomById(id) {
    return await Uom.findByPk(id);
  },
  async updateUom(id, data) {
    const uom = await Uom.findByPk(id);
    if (!uom) return null;
    return await uom.update(data);
  },
  async deleteUom(id) {
    const uom = await Uom.findByPk(id);
    if (!uom) return null;
    await uom.destroy();
    return true;
  },
};
