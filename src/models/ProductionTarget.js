'use strict';
module.exports = (sequelize, DataTypes) => {
  const ProductionTarget = sequelize.define('ProductionTarget', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    brand_id: { type: DataTypes.STRING(36), allowNull: false },
    target_date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    notes: DataTypes.TEXT
  }, {
    tableName: 'ProductionTargets',
    timestamps: true,
  });

  ProductionTarget.associate = function(models) {
    ProductionTarget.hasMany(models.ProductionTargetStore, { foreignKey: 'production_target_id', as: 'stores' });
  };

  return ProductionTarget;
};
