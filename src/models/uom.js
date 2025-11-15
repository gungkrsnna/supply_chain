"use strict";

module.exports = (sequelize, DataTypes) => {
  const Uom = sequelize.define(
    "Uom",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false },
    },
    {
      tableName: "Uoms",
      timestamps: true,
    }
  );

  Uom.associate = (models) => {
      models.Uom.hasMany(models.ItemMeasurement, { foreignKey: 'uom_id', as: 'item_measurements' });
  };

  return Uom;
};
