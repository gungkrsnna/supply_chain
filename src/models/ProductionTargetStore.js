'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionTargetStore = sequelize.define('ProductionTargetStore', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    production_target_id: { type: DataTypes.STRING(36), allowNull: false },
    store_id: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    tableName: 'ProductionTargetStores',
    timestamps: true,
  });

  ProductionTargetStore.associate = function(models) {
    ProductionTargetStore.belongsTo(models.ProductionTarget, { foreignKey: 'production_target_id', as: 'productionTarget' });
    ProductionTargetStore.hasMany(models.ProductionTargetItem, { foreignKey: 'production_target_store_id', as: 'items' });
    ProductionTargetStore.belongsTo(models.Store, { foreignKey: 'store_id', as: 'store' });
  };

  return ProductionTargetStore;
};
