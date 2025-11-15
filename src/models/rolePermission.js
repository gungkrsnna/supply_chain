"use strict";
module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define(
    "RolePermission",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      role_id: { type: DataTypes.INTEGER },
      permission_id: { type: DataTypes.INTEGER },
    },
    {
      tableName: "role_permissions",
      timestamps: true,
    }
  );

  RolePermission.associate = (models) => {
    RolePermission.belongsTo(models.Role, { foreignKey: "role_id" });
    RolePermission.belongsTo(models.Permission, {
      foreignKey: "permission_id",
      as: "permission",
    });
  };
  return RolePermission;
};
