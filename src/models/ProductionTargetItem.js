'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionTargetItem = sequelize.define('ProductionTargetItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    production_target_store_id: { type: DataTypes.INTEGER, allowNull: false },
    fg_item_id: { type: DataTypes.INTEGER, allowNull: false },
    planned_qty: { type: DataTypes.DECIMAL(18,6), allowNull: false },
    planned_gram_per_unit: { type: DataTypes.DECIMAL(18,6), allowNull: true },
    notes: DataTypes.TEXT
  }, {
    tableName: 'ProductionTargetItems',
    timestamps: true,
  });

  ProductionTargetItem.associate = function(models) {
    ProductionTargetItem.belongsTo(models.ProductionTargetStore, { foreignKey: 'production_target_store_id', as: 'storeTarget' });
    ProductionTargetItem.belongsTo(models.Item, { foreignKey: 'fg_item_id', as: 'fg' });
  };

  return ProductionTargetItem;
};
