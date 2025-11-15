// services/brandService.js
class BrandService {
  constructor({ BrandModel }) {
    this.Brand = BrandModel;
  }

  async create(data) {
    // data: { kode, nama, color, logo }
    const brand = await this.Brand.create(data);
    return brand;
  }

  async findAll({ page = 1, limit = 20, q } = {}) {
    const offset = (page - 1) * limit;
    const where = {};
    if (q) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { nama: { [Op.like]: `%${q}%` } },
        { kode: { [Op.like]: `%${q}%` } }
      ];
    }
    const { rows, count } = await this.Brand.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
    return { data: rows, meta: { total: count, page, limit } };
  }

  async findById(id) {
    const brand = await this.Brand.findByPk(id);
    return brand;
  }

  async update(id, payload) {
    const brand = await this.Brand.findByPk(id);
    if (!brand) throw new Error('Brand tidak ditemukan');
    await brand.update(payload);
    return brand;
  }

  async delete(id) {
    const brand = await this.Brand.findByPk(id);
    if (!brand) throw new Error('Brand tidak ditemukan');
    await brand.destroy();
    return true;
  }
}

module.exports = BrandService;
