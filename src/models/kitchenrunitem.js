'use strict';
module.exports = (sequelize, DataTypes) => {
  const KitchenRunItem = sequelize.define('KitchenRunItem', {
    kitchen_run_id: DataTypes.INTEGER,
    item_id: DataTypes.INTEGER,
    item_name: DataTypes.STRING,
    target_production: DataTypes.INTEGER,
    leftover_previous: DataTypes.INTEGER,
    adjustment: DataTypes.INTEGER,
    total_jumlah_produksi: DataTypes.INTEGER,
    dough_type: DataTypes.STRING,
    dough_weight_per_unit: DataTypes.INTEGER,
    filling_type: DataTypes.STRING,
    filling_per_unit_gram: DataTypes.INTEGER,
  }, {
    tableName: 'kitchen_run_items',
    timestamps: false,
    underscored: true,
  });

  KitchenRunItem.associate = function(models) {
    KitchenRunItem.belongsTo(models.KitchenRun, { foreignKey: 'kitchen_run_id', as: 'run' });
  };

  return KitchenRunItem;
};
