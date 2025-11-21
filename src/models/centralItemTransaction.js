// models/centralItemTransaction.js
"use strict";

module.exports = (sequelize, DataTypes) => {
  const CentralItemTransaction = sequelize.define(
    "CentralItemTransaction",
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false }, // central kitchen as store
      item_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      measurement_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      type: { type: DataTypes.STRING(32), allowNull: false },
      quantity: { type: DataTypes.DECIMAL(18,6), allowNull: true },
      converted_qty: { type: DataTypes.DECIMAL(18,6), allowNull: false },
      reference: { type: DataTypes.STRING(255), allowNull: true },
      note: { type: DataTypes.TEXT, allowNull: true },
      measurement_breakdown: { type: DataTypes.JSON, allowNull: true }, // optional
      operator_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      meta: { type: DataTypes.JSON, allowNull: true }
    },
    {
      tableName: "central_item_transactions",
      timestamps: true
    }
  );

  CentralItemTransaction.associate = (models) => {
    CentralItemTransaction.belongsTo(models.Item, { foreignKey: "item_id" });
    CentralItemTransaction.belongsTo(models.ItemMeasurement, { foreignKey: "measurement_id" });
    CentralItemTransaction.belongsTo(models.Store, { foreignKey: "store_id", as: "store" });
    if (models.User) CentralItemTransaction.belongsTo(models.User, { foreignKey: "operator_id", as: "operator" });
  };

  return CentralItemTransaction;
};
