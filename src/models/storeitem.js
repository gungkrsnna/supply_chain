"use strict";

module.exports = (sequelize, DataTypes) => {
  const StoreItem = sequelize.define(
    "StoreItem",
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      item_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      stock: { type: DataTypes.DECIMAL(18,6), allowNull: false, defaultValue: 0 } // base unit
    },
    {
      tableName: "store_items",
      timestamps: true,
      indexes: [{ unique: true, fields: ["store_id", "item_id"] }]
    }
  );

  StoreItem.associate = (models) => {
    StoreItem.belongsTo(models.Store, { foreignKey: "store_id" });
    StoreItem.belongsTo(models.Item, { foreignKey: "item_id" });
  };

  return StoreItem;
};
