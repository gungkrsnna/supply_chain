"use strict";

module.exports = (sequelize, DataTypes) => {
  const Request = sequelize.define(
    "Request",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: true },
      request_category_id: { type: DataTypes.INTEGER, allowNull: true },
      user_id: { type: DataTypes.INTEGER, allowNull: true },
      code: { type: DataTypes.STRING, allowNull: false, unique: true },
      date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      approved_by: { type: DataTypes.INTEGER, allowNull: true },
      approved_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: 0,
      },
      notes: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: "Requests",
      timestamps: true,
    }
  );
  Request.associate = (models) => {
    Request.belongsTo(models.Store, { foreignKey: "store_id", as: "store" });
    Request.belongsTo(models.RequestCategory, {
      foreignKey: "request_category_id",
      as: "request_category",
    });
    Request.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    Request.hasMany(models.RequestDetail, {
      foreignKey: "request_id",
      as: "request_details",
    });
  };
  return Request;
};
