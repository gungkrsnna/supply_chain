'use strict';

module.exports = (sequelize, DataTypes) => {
  const Store = sequelize.define(
    'Store',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      // foreign key ke Brand (UUID string 36)
      brandId: {
        type: DataTypes.STRING(36),
        allowNull: false,            // ubah ke true jika ada stores tanpa brand sementara
        field: 'brand_id'
      },

      name: { type: DataTypes.STRING },
      address: { type: DataTypes.STRING },
      phone: { type: DataTypes.STRING },
    },
    {
      tableName: 'Stores', // sesuaikan jika nama table beda (stores lowercase?)
      timestamps: true,
      underscored: false, // gunakan true jika ingin created_at / updated_at snake_case
    }
  );

  Store.associate = function(models) {
    // asumsikan model Brand tersedia di models/index.js
    if (models.Brand) {
      // gunakan foreignKey 'brandId' yang dipetakan ke kolom 'brand_id'
      Store.belongsTo(models.Brand, { as: 'brand', foreignKey: 'brandId' });
    }
  };

  return Store;
};
