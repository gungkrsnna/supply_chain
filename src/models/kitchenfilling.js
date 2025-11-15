'use strict';
module.exports = (sequelize, DataTypes) => {
  const KitchenFilling = sequelize.define('KitchenFilling', {
    kitchen_run_id: DataTypes.INTEGER,
    filling_type: DataTypes.STRING,
    total_gram: DataTypes.INTEGER,
    takaran_per_loyang: DataTypes.INTEGER,
    loyang_needed: DataTypes.INTEGER,
    remainder_gram: DataTypes.INTEGER,
  }, {
    tableName: 'kitchen_filling',
    timestamps: false,
    underscored: true,
  });

  KitchenFilling.associate = function(models) {
    KitchenFilling.belongsTo(models.KitchenRun, { foreignKey: 'kitchen_run_id', as: 'run' });
  };

  return KitchenFilling;
};
