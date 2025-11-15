"use strict";

module.exports = (sequelize, DataTypes) => {
  const CategoryItem = sequelize.define(
    "CategoryItem",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      kode: { // ← tambahkan ini
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "category_items",
      timestamps: true,
    }
  );

  // kalau nanti ada relasi, taruh di sini
  CategoryItem.associate = (models) => {
    // contoh:
    // CategoryItem.hasMany(models.Product, { foreignKey: 'category_id' });
  };

  return CategoryItem;
};
