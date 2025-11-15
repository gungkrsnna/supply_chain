'use strict';
module.exports = (sequelize, DataTypes) => {
  const DeliveryOrder = sequelize.define('DeliveryOrder', {
    kitchen_run_id: DataTypes.INTEGER,
    no_surat_jalan: DataTypes.STRING,
    destination_store_id: DataTypes.INTEGER,
    created_by: DataTypes.INTEGER,
    status: DataTypes.STRING,
    printed_at: DataTypes.DATE,
  }, {
    tableName: 'delivery_orders',
    timestamps: false,
    underscored: true,
  });

  DeliveryOrder.associate = function(models) {
    DeliveryOrder.belongsTo(models.KitchenRun, { foreignKey: 'kitchen_run_id', as: 'run' });
    DeliveryOrder.hasMany(models.DeliveryOrderItem, { foreignKey: 'delivery_order_id', as: 'items' });
  };

  return DeliveryOrder;
};
