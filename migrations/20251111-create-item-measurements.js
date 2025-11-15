'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ItemMeasurements', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'items' /* or 'Items' depending case in DB */, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      uom_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'uoms', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      value: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      value_in_grams: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // optional: add index for lookups
    await queryInterface.addIndex('ItemMeasurements', ['item_id']);
    await queryInterface.addIndex('ItemMeasurements', ['uom_id']);
  },

  down: async (queryInterface /* Sequelize */) => {
    await queryInterface.dropTable('ItemMeasurements');
  }
};
