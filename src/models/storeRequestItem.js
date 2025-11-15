// models/storeRequestItem.js
"use strict";
module.exports = (sequelize, DataTypes) => {
  const StoreRequestItem = sequelize.define("StoreRequestItem", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    store_request_id: { type: DataTypes.INTEGER, allowNull: false },
    item_id: { type: DataTypes.INTEGER, allowNull: false },
    requested_qty: { type: DataTypes.DECIMAL(18,4), allowNull: false, defaultValue: 0 },
    uom_id: { type: DataTypes.INTEGER, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: "store_request_items",
    timestamps: true
  });

  StoreRequestItem.associate = function(models) {
    StoreRequestItem.belongsTo(models.StoreRequest, { foreignKey: "store_request_id", as: "request" });
    StoreRequestItem.belongsTo(models.Item, { foreignKey: "item_id", as: "item" });
    StoreRequestItem.belongsTo(models.Uom, { foreignKey: "uom_id", as: "uom" });
  };

  return StoreRequestItem;
};
