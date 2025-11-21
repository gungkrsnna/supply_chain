// models/centralItem.js
"use strict";

module.exports = (sequelize, DataTypes) => {
  const CentralItem = sequelize.define(
    "CentralItem",
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false }, // maps to central kitchen id
      item_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      stock: { type: DataTypes.DECIMAL(18,6), allowNull: false, defaultValue: 0 } // base unit
    },
    {
      tableName: "central_items",
      timestamps: true,
      indexes: [{ unique: true, fields: ["store_id", "item_id"] }]
    }
  );

  CentralItem.associate = (models) => {
    CentralItem.belongsTo(models.Store, { foreignKey: "store_id", as: "store" });
    CentralItem.belongsTo(models.Item, { foreignKey: "item_id", as: "item" });
  };

  return CentralItem;
};
