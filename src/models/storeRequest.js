// models/storeRequest.js
"use strict";
module.exports = (sequelize, DataTypes) => {
  const StoreRequest = sequelize.define("StoreRequest", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    store_id: { type: DataTypes.INTEGER, allowNull: false },
    request_code: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" }, // pending/approved/rejected/fulfilled
    note: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    processed_by: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: "store_requests",
    timestamps: true
  });

  StoreRequest.associate = function(models) {
    StoreRequest.belongsTo(models.Store, { foreignKey: "store_id", as: "store" });
    StoreRequest.hasMany(models.StoreRequestItem, { foreignKey: "store_request_id", as: "items" });
  };

  return StoreRequest;
};
