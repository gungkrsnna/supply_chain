const { Store, sequelize } = require("../models"); // jika index export sequelize
const { Op } = require("sequelize");

module.exports = {
  async createStore(data) {
    console.log("service.createStore data:", data);
    const created = await Store.create(data);
    console.log("service.createStore created id:", created.id);
    return created;
  },

  async getAllStores({ brandId, q } = {}) {
    const where = {};
    if (brandId) {
      // coba dua varian: brandId dan brand_id (log untuk memastikan)
      where.brandId = brandId;
    }
    if (q) {
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { address: { [Op.like]: `%${q}%` } },
        { phone: { [Op.like]: `%${q}%` } },
      ];
    }

    // debug: tunjukkan rawAttributes dan where
    try {
      console.log("service.getAllStores - Store.rawAttributes keys:", Object.keys(Store.rawAttributes || {}));
    } catch (e) {
      console.warn("could not read Store.rawAttributes:", e.message);
    }
    console.log("service.getAllStores - WHERE:", JSON.stringify(where));

    const rows = await Store.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: 1000
    });

    console.log("service.getAllStores - rows.length:", rows.length);
    return rows;
  },

  async getStoreById(id) {
    console.log("service.getStoreById id:", id);
    return Store.findByPk(id);
  },

  async updateStore(id, data) {
    console.log("service.updateStore id:", id, "data:", data);
    const store = await Store.findByPk(id);
    if (!store) return null;
    const updated = await store.update(data);
    console.log("service.updateStore updated:", updated.toJSON ? updated.toJSON() : updated);
    return updated;
  },

  async deleteStore(id) {
    console.log("service.deleteStore id:", id);
    const store = await Store.findByPk(id);
    if (!store) return null;
    await store.destroy();
    console.log("service.deleteStore destroyed id:", id);
    return true;
  },
};
