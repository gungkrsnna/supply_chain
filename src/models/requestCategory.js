"use strict";

module.exports = (sequelize, DataTypes) => {
  const RequestCategory = sequelize.define(
    "RequestCategory",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false },
    },
    {
      tableName: "Request_Categories",
      timestamps: true,
    }
  );

  RequestCategory.associate = (models) => {
    RequestCategory.hasMany(models.Request, {
      foreignKey: "category_id",
      as: "requests",
    });
  };
  return RequestCategory;
};
