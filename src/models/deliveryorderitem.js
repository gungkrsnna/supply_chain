// src/models/deliveryorderitem.js
'use strict';
module.exports = (sequelize, DataTypes) => {
  const DeliveryOrderItem = sequelize.define('DeliveryOrderItem', {
    delivery_order_id: DataTypes.INTEGER,
    item_id: DataTypes.INTEGER,
    item_name: DataTypes.STRING,
    qty: DataTypes.INTEGER,
  }, {
    tableName: 'delivery_order_items',
    timestamps: false,
    underscored: true,
  });

  DeliveryOrderItem.associate = function(models) {
    DeliveryOrderItem.belongsTo(models.DeliveryOrder, { foreignKey: 'delivery_order_id', as: 'delivery' });
  };

  return DeliveryOrderItem;
};
