"use strict";

module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define(
    "Permission",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING },
      label: { type: DataTypes.STRING },
    },
    {
      tableName: "Permissions",
      timestamps: true,
    }
  );

  Permission.associate = (models) => {
    Permission.belongsToMany(models.RolePermission, {
      through: "role_permissions",
      foreignKey: "permission_id",
    });
  };

  return Permission;
};
