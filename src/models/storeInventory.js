// src/models/storeInventory.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const StoreInventory = sequelize.define('StoreInventory', {
    store_id: { type: DataTypes.INTEGER, allowNull: false },
    item_id: { type: DataTypes.INTEGER, allowNull: true },
    product_name: { type: DataTypes.STRING, allowNull: true }, // optional if you want name stored here
    qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    unit: { type: DataTypes.STRING, allowNull: true },
    min_stock: { type: DataTypes.INTEGER, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'inventories', // adjust if your table has different name
    timestamps: true,
    underscored: false,
  });

  StoreInventory.associate = function(models) {
    // if you have models.Store and models.Item
    if (models.Store) StoreInventory.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });
    if (models.Item) StoreInventory.belongsTo(models.Item, { foreignKey: 'item_id', as: 'item' });
  };

  return StoreInventory;
};
