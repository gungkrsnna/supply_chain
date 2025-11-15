"use strict";

module.exports = (sequelize, DataTypes) => {
  const inventory = sequelize.define(
    "Inventory",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      item_id: { type: DataTypes.INTEGER, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: "Inventories",
      timestamps: true,
    }
  );

  // 👇 asosiasi didefinisikan di sini (dipanggil setelah semua model di-load di index.js)
  inventory.associate = (models) => {
    inventory.belongsTo(models.Store, {
      foreignKey: "store_id",
      as: "store",
    });

    inventory.belongsTo(models.Item, {
      foreignKey: "item_id",
      as: "item",
    });
  };

  return inventory;
};
