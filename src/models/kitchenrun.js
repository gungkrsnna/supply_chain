'use strict';
module.exports = (sequelize, DataTypes) => {
  const KitchenRun = sequelize.define('KitchenRun', {
    date: DataTypes.DATEONLY,
    status: DataTypes.STRING,
    created_by: DataTypes.INTEGER
  }, {
    tableName: 'kitchen_runs',
    timestamps: false,
    underscored: true,
  });

  KitchenRun.associate = function(models) {
    KitchenRun.hasMany(models.KitchenRunItem, { foreignKey: 'kitchen_run_id', as: 'items' });
    KitchenRun.hasMany(models.KitchenDough, { foreignKey: 'kitchen_run_id', as: 'dough' });
    KitchenRun.hasMany(models.KitchenFilling, { foreignKey: 'kitchen_run_id', as: 'filling' });
    KitchenRun.hasMany(models.KitchenQc, { foreignKey: 'kitchen_run_id', as: 'qc' });
  };

  return KitchenRun;
};
