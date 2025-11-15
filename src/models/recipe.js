'use strict';

module.exports = (sequelize, DataTypes) => {
  const Recipe = sequelize.define('Recipe', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4, // generate UUID di Sequelize
      allowNull: false
    },
    item_id: { type: DataTypes.INTEGER, allowNull: false },
    name: DataTypes.STRING,
    version: DataTypes.STRING(50),
    yield_qty: { type: DataTypes.DECIMAL(18,6), defaultValue: 1 },
    uom_id: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: false },
    notes: DataTypes.TEXT
  }, {
    tableName: 'Recipes',
    timestamps: true
  });

  Recipe.associate = function(models) {
    Recipe.belongsTo(models.Item, { foreignKey: 'item_id', as: 'item' });
    Recipe.belongsTo(models.Uom, { foreignKey: 'uom_id', as: 'uom' });

    Recipe.hasMany(models.RecipeComponent, { foreignKey: 'recipe_id', as: 'components', onDelete: 'CASCADE' });
  };

  return Recipe;
};
