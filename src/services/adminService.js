// services/adminService.js
"use strict";
const models = require("../models");
const { sequelize } = models;
const { Brand, StoreRequest } = models; // sesuaikan nama model Anda

module.exports = {
  // existing listBrands...
  async listBrands(opts = {}) {
    const where = {};
    if (opts.onlyActive) where.is_active = 1;
    return await Brand.findAll({ where, order: [["nama","ASC"]] });
  },

  // new: list brands + pending request count
  async listBrandsWithRequestCounts(opts = {}) {
    // LEFT JOIN ke store_requests dan hitung yang status = 'pending'
    return await Brand.findAll({
      attributes: [
        "id",
        "nama",
        "kode",
        "logo",
        // hitung pending requests
        [sequelize.fn("COUNT", sequelize.col("StoreRequests.id")), "pending_count"]
      ],
      include: [
        {
          model: StoreRequest,
          as: "StoreRequests", // pastikan association Brand.hasMany(StoreRequest, {as: "StoreRequests", foreignKey: 'brand_id'})
          attributes: [],
          where: opts.onlyActive ? { status: "pending" } : { status: "pending" },
          required: false
        }
      ],
      group: ["Brand.id"],
      order: [["nama", "ASC"]]
    });
  }
};
