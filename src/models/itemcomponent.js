'use strict';
module.exports = (sequelize, DataTypes) => {
  const ItemComponent = sequelize.define('ItemComponent', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fg_item_id: { type: DataTypes.INTEGER, allowNull: false },
    component_item_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(12,4), defaultValue: 1.0000 },
    uom_id: { type: DataTypes.INTEGER, allowNull: true },
    is_optional: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'item_components',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  ItemComponent.associate = function(models) {
    ItemComponent.belongsTo(models.Item, { foreignKey: 'fg_item_id', as: 'fgItem' });
    ItemComponent.belongsTo(models.Item, { foreignKey: 'component_item_id', as: 'componentItem' });
  };

  return ItemComponent;
};
