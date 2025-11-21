"use strict";

module.exports = (sequelize, DataTypes) => {
  const Item = sequelize.define(
    "Item",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      category_item_id: { type: DataTypes.INTEGER, allowNull: true },
      uom_id: { type: DataTypes.INTEGER, allowNull: true },
      code: { type: DataTypes.STRING, allowNull: true, unique: true },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT },
      is_production: { type: DataTypes.BOOLEAN, defaultValue: false },
      image: { type: DataTypes.STRING, allowNull: true }, // new
    },
    {
      tableName: "Items",
      timestamps: true,
    }
  );

  Item.associate = (models) => {
    Item.belongsTo(models.CategoryItem, {
      foreignKey: "category_item_id",
      as: "category_item",
    });

    Item.belongsTo(models.Uom, {
      foreignKey: "uom_id",
      as: "uom",
    });
  };

  Item.associate = (models) => {
    Item.belongsTo(models.CategoryItem, {
      foreignKey: "category_item_id",
      as: "category_item",
    });

    Item.belongsTo(models.Uom, {
      foreignKey: "uom_id",
      as: "uom",
    });

    // ------------------------------------------------
    // Relasi untuk BOM / component
    // ------------------------------------------------
    // jika item ini adalah FG, dapatkan komponennya (child)
    Item.hasMany(models.ItemComponent, {
      foreignKey: "fg_item_id",
      as: "components",
    });

    // jika item ini adalah component, dapatkan parent assemblies
    Item.hasMany(models.ItemComponent, {
      foreignKey: "component_item_id",
      as: "parentAssemblies",
    });

    // convenience: langsung ambil Item models yang menjadi komponen
    Item.belongsToMany(models.Item, {
      through: models.ItemComponent,
      as: "componentItems",        // Item.componentItems -> daftar Item yang jadi komponen bagi this Item (jika this Item adalah FG)
      foreignKey: "fg_item_id",
      otherKey: "component_item_id",
      timestamps: false
    });

    // inside Item.associate = function(models) { ... }
    models.Item.hasMany(models.ItemMeasurement, { foreignKey: 'item_id', as: 'measurements' });

  };


  return Item;
};
