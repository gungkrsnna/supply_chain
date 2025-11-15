"use strict";

module.exports = (sequelize, DataTypes) => {
  const StoreItemTransaction = sequelize.define(
    "StoreItemTransaction",
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      item_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      measurement_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      type: { type: DataTypes.STRING(32), allowNull: false },
      quantity: { type: DataTypes.DECIMAL(18,6), allowNull: true }, // in measurement unit (or base if measurement null)
      converted_qty: { type: DataTypes.DECIMAL(18,6), allowNull: false }, // in base unit
      reference: { type: DataTypes.STRING(255), allowNull: true },
      note: { type: DataTypes.TEXT, allowNull: true }
    },
    {
      tableName: "store_item_transactions",
      timestamps: true
    }
  );

  StoreItemTransaction.associate = (models) => {
    StoreItemTransaction.belongsTo(models.Store, { foreignKey: "store_id" });
    StoreItemTransaction.belongsTo(models.Item, { foreignKey: "item_id" });
    StoreItemTransaction.belongsTo(models.ItemMeasurement, { foreignKey: "measurement_id" });
  };

  return StoreItemTransaction;
};
