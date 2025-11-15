// models/brand.js
module.exports = (sequelize, DataTypes) => {
  const Brand = sequelize.define('Brand', {
    id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4, // otomatis generate UUID
    },
    kode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // 🧩 tambahkan ini
      validate: {
        notEmpty: true,
      },
      set(value) {
        if (typeof value === 'string') {
          this.setDataValue('kode', value.trim().toUpperCase()); // normalisasi agar konsisten
        }
      },
    },
    nama: {
      type: DataTypes.STRING(191),
      allowNull: false
    },
    logo: {
      type: DataTypes.STRING(255), // path atau URL
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: true
    }
  }, {
    tableName: 'brands',
    timestamps: true, // createdAt, updatedAt
    underscored: false
  });

  return Brand;
};
