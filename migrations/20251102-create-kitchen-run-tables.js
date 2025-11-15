'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // kitchen_runs
    await queryInterface.createTable('kitchen_runs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'pending' },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // kitchen_run_items
    await queryInterface.createTable('kitchen_run_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kitchen_run_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'kitchen_runs', key: 'id' }, onDelete: 'CASCADE' },
      item_id: { type: Sequelize.INTEGER, allowNull: false },
      item_name: { type: Sequelize.STRING(255), allowNull: true },
      target_production: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      leftover_previous: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      adjustment: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      total_jumlah_produksi: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      dough_type: { type: Sequelize.STRING(100), allowNull: true },
      dough_weight_per_unit: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      filling_type: { type: Sequelize.STRING(100), allowNull: true },
      filling_per_unit_gram: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // kitchen_dough
    await queryInterface.createTable('kitchen_dough', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kitchen_run_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'kitchen_runs', key: 'id' }, onDelete: 'CASCADE' },
      dough_type: { type: Sequelize.STRING(100), allowNull: true },
      total_weight: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      total_loyang: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      remainder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // kitchen_filling
    await queryInterface.createTable('kitchen_filling', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kitchen_run_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'kitchen_runs', key: 'id' }, onDelete: 'CASCADE' },
      filling_type: { type: Sequelize.STRING(100), allowNull: true },
      total_gram: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      takaran_per_loyang: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      loyang_needed: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      remainder_gram: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // kitchen_qc
    await queryInterface.createTable('kitchen_qc', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      kitchen_run_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'kitchen_runs', key: 'id' }, onDelete: 'CASCADE' },
      stage: { type: Sequelize.STRING(50), allowNull: false },
      status: { type: Sequelize.STRING(20), allowNull: false },
      note: { type: Sequelize.TEXT, allowNull: true },
      checked_by: { type: Sequelize.INTEGER, allowNull: true },
      checked_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  down: async (queryInterface /*, Sequelize */) => {
    await queryInterface.dropTable('kitchen_qc');
    await queryInterface.dropTable('kitchen_filling');
    await queryInterface.dropTable('kitchen_dough');
    await queryInterface.dropTable('kitchen_run_items');
    await queryInterface.dropTable('kitchen_runs');
  }
};
