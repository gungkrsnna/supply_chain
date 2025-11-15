const { CategoryItem } = require("../models");

module.exports = {
  async createCategoryItem(data) {
    return await CategoryItem.create(data);
  },
  async getAllCategoryItems() {
    return await CategoryItem.findAll();
  },
  async getCategoryItemById(id) {
    return await CategoryItem.findByPk(id);
  },
  async updateCategoryItem(id, data) {
    const item = await CategoryItem.findByPk(id);
    if (!item) return null;
    return await item.update(data);
  },
  async deleteCategoryItem(id) {
    const item = await CategoryItem.findByPk(id);
    if (!item) return null;
    await item.destroy();
    return true;
  },
};
