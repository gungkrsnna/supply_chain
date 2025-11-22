"use strict";

module.exports = (sequelize, DataTypes) => {
  const StoreItemTransaction = sequelize.define(
    "StoreItemTransaction",
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      from_store_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      to_store_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      item_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      measurement_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
      type: { type: DataTypes.STRING(32), allowNull: false }, // e.g. 'in', 'out', 'adjustment', 'transfer', 'usage'
      quantity: { type: DataTypes.DECIMAL(18,6), allowNull: true }, // measurement unit (nullable if not applicable)
      converted_qty: { type: DataTypes.DECIMAL(18,6), allowNull: false }, // base unit (always positive magnitude)
      reference: { type: DataTypes.STRING(255), allowNull: true },
      note: { type: DataTypes.TEXT, allowNull: true },
      measurement_breakdown: { type: DataTypes.JSON, allowNull: true } // store raw breakdown if needed
    },
    {
      tableName: "store_item_transactions",
      timestamps: true
    }
  );

  StoreItemTransaction.associate = (models) => {
    StoreItemTransaction.belongsTo(models.Store, { foreignKey: "store_id", as: "store" });
    StoreItemTransaction.belongsTo(models.Store, { foreignKey: "from_store_id", as: "fromStore" });
    StoreItemTransaction.belongsTo(models.Store, { foreignKey: "to_store_id", as: "toStore" });
    StoreItemTransaction.belongsTo(models.Item, { foreignKey: "item_id", as: "item" });
    StoreItemTransaction.belongsTo(models.ItemMeasurement, { foreignKey: "measurement_id", as: "measurement" });
  };

  return StoreItemTransaction;
};
