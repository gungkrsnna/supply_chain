const { Role } = require("../models");

module.exports = {
  async createRole(data) {
    return await Role.create(data);
  },
  async getPermissionsByIds(permissions) {
    return await Permission.findAll({
      where: { id: permissions },
    });
  },
};
