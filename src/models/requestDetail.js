"use strict";

module.exports = (sequelize, DataTypes) => {
  const RequestDetail = sequelize.define(
    "RequestDetail",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      request_id: { type: DataTypes.INTEGER, allowNull: false },
      item_id: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false },
      notes: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: "Request_Details",
      timestamps: true,
    }
  );

  RequestDetail.associate = (models) => {
    RequestDetail.belongsTo(models.Request, { foreignKey: "request_id" });
    RequestDetail.belongsTo(models.Item, { foreignKey: "item_id" });
  };

  return RequestDetail;
};
