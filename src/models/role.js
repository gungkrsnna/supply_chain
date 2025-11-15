"use strict";

module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    "Role",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING },
    },
    {
      tableName: "Roles",
      timestamps: true,
    }
  );
  Role.associate = (models) => {
    Role.hasMany(models.RolePermission, {
      foreignKey: "role_id",
      as: "role_permissions",
    });
    Role.belongsTo(models.User, {
      through: "user_role",
      as: "user",
      foreignKey: "id",
    });
  };

  return Role;
};
