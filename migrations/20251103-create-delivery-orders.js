'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('delivery_orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kitchen_run_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'kitchen_runs', key: 'id' }, onDelete: 'CASCADE' },
      no_surat_jalan: { type: Sequelize.STRING(100), allowNull: true, unique: true },
      destination_store_id: { type: Sequelize.INTEGER, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      status: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'draft' }, // draft, printed, delivered
      printed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // Optionally create items relation table delivery_order_items
    await queryInterface.createTable('delivery_order_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      delivery_order_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'delivery_orders', key: 'id' }, onDelete: 'CASCADE' },
      item_id: { type: Sequelize.INTEGER, allowNull: false },
      item_name: { type: Sequelize.STRING(255), allowNull: true },
      qty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });
  },

  down: async (queryInterface /*, Sequelize */) => {
    await queryInterface.dropTable('delivery_order_items');
    await queryInterface.dropTable('delivery_orders');
  }
};
