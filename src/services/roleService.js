const { Role, RolePermission } = require("../models");

module.exports = {
  async createRole(data) {
    return await Role.create(data);
  },
  async getAllRoles() {
    return await Role.findAll();
  },
  async getRoleById(id) {
    return await Role.findByPk(id);
  },
  async updateRole(id, data) {
    const role = await Role.findByPk(id);
    if (!role) return null;
    return await role.update(data);
  },
  async deleteRole(id) {
    const role = await Role.findByPk(id);
    if (!role) return null;
    await role.destroy();
    return true;
  },
  async getRoleByName(name) {
    return await Role.findOne({ where: { name } });
  },
  async getAllRoles() {
    return await Role.findAll();
  }
};
