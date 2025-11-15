"use strict";

module.exports = (sequelize, DataTypes) => {
  const DailyProduction = sequelize.define(
    "DailyProduction",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      store_id: { type: DataTypes.INTEGER, allowNull: false },
      user_id: { type: DataTypes.INTEGER, allowNull: false },
      item_id: { type: DataTypes.INTEGER, allowNull: false },
      request_category_id: { type: DataTypes.INTEGER, allowNull: true },
      quantity: { type: DataTypes.INTEGER, allowNull: false },

      // 🆕 tambahkan kolom date
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
    },
    {
      tableName: "daily_productions",
      timestamps: true,
    }
  );

  // 👇 asosiasi
  DailyProduction.associate = (models) => {
    DailyProduction.belongsTo(models.Store, {
      foreignKey: "store_id",
      as: "store",
    });

    DailyProduction.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });

    DailyProduction.belongsTo(models.Item, {
      foreignKey: "item_id",
      as: "item",
    });
  };

  return DailyProduction;
};
