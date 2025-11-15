'use strict';
module.exports = (sequelize, DataTypes) => {
  const KitchenQc = sequelize.define('KitchenQc', {
    kitchen_run_id: DataTypes.INTEGER,
    stage: DataTypes.STRING,
    status: DataTypes.STRING,
    note: DataTypes.TEXT,
    checked_by: DataTypes.INTEGER,
    checked_at: DataTypes.DATE,
  }, {
    tableName: 'kitchen_qc',
    timestamps: false,
    underscored: true,
  });

  KitchenQc.associate = function(models) {
    KitchenQc.belongsTo(models.KitchenRun, { foreignKey: 'kitchen_run_id', as: 'run' });
  };

  return KitchenQc;
};
