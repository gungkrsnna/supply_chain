"use strict";

module.exports = (sequelize, DataTypes) => {
  const ItemMeasurement = sequelize.define(
    "ItemMeasurement",
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      item_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      uom_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      value: { type: DataTypes.DECIMAL(18,6), allowNull: false }, // multiplier to base unit
      value_in_grams: { type: DataTypes.DECIMAL(18,6), allowNull: true }
    },
    {
      tableName: "ItemMeasurements",
      timestamps: true
    }
  );

  ItemMeasurement.associate = (models) => {
    ItemMeasurement.belongsTo(models.Item, { foreignKey: "item_id" });
    ItemMeasurement.belongsTo(models.Uom, { foreignKey: "uom_id", as: "uom" });
  };

  return ItemMeasurement;
};
