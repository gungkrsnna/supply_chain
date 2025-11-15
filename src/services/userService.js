const { User, Role, RolePermission, Permission } = require("../models");
const roleService = require("./roleService");

module.exports = {
  async createUser(data) {
    return await User.create(data);
  },

  async getAllUsers() {
    return await User.findAll();
  },

  async getUserById(id) {
    return await User.findByPk(id);
  },

  async updateUser(id, data) {
    const user = await User.findByPk(id);
    if (!user) return null;
    return await user.update(data);
  },

  async deleteUser(id) {
    const user = await User.findByPk(id);
    if (!user) return null;
    await user.destroy();
    return true;
  },

  async findUserByEmail(email) {
    // ambil user tanpa include (menghindari error asosiasi)
    const user = await User.findOne({
      where: { email },
      // raw: false, // kita mau instance agar bisa akses dataValues jika perlu
      include: [
        {
          model: Role,
          as: "role",
          include: [
            {
              model: RolePermission,
              as: "role_permissions",
              attributes: ["id", "role_id", "permission_id"],
              include: [
                {
                  model: Permission,
                  as: "permission",
                  attributes: ["id", "name", "label"],
                },
              ],
            },
          ],
        },
      ],
    });
    // if (!user) return null;

    // // ambil role secara terpisah jika ada role_id
    // if (user.role_id) {
    //   const role = await roleService.getRoleById(user.role_id);
    //   // tambahkan properti role ke hasil (sesuaikan format yang Anda butuhkan)
    //   user.dataValues.role = role ? role || role : null;
    // } else {
    //   user.dataValues.role = null;
    // }

    return user;
  },
};
