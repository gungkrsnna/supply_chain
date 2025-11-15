'use strict';
module.exports = (sequelize, DataTypes) => {
  const KitchenDough = sequelize.define('KitchenDough', {
    kitchen_run_id: DataTypes.INTEGER,
    dough_type: DataTypes.STRING,
    total_weight: DataTypes.INTEGER,
    total_loyang: DataTypes.INTEGER,
    remainder: DataTypes.INTEGER,
  }, {
    tableName: 'kitchen_dough',
    timestamps: false,
    underscored: true,
  });

  KitchenDough.associate = function(models) {
    KitchenDough.belongsTo(models.KitchenRun, { foreignKey: 'kitchen_run_id', as: 'run' });
  };

  return KitchenDough;
};
