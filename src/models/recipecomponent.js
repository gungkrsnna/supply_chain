'use strict';
module.exports = (sequelize, DataTypes) => {
  const RecipeComponent = sequelize.define('RecipeComponent', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    recipe_id: { type: DataTypes.UUID, allowNull: false },
    component_item_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.DECIMAL(18,6), allowNull: false },
    uom_id: { type: DataTypes.INTEGER, allowNull: true },
    waste_percent: { type: DataTypes.DECIMAL(5,2), defaultValue: 0 },
    sequence: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_optional: { type: DataTypes.BOOLEAN, defaultValue: false },
    notes: DataTypes.TEXT
  }, {
    tableName: 'recipe_components',
    timestamps: true
  });

  RecipeComponent.associate = function(models) {
    RecipeComponent.belongsTo(models.Recipe, { foreignKey: 'recipe_id', as: 'recipe' });
    RecipeComponent.belongsTo(models.Item, { foreignKey: 'component_item_id', as: 'componentItem' });
    RecipeComponent.belongsTo(models.Uom, { foreignKey: 'uom_id', as: 'uom' });
  };

  return RecipeComponent;
};
