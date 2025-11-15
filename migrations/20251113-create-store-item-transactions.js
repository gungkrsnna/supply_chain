'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('store_item_transactions', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'store', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      measurement_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'itemmeasurments', key: 'id' }, // sesuai nama tabel yang kamu punya
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      type: {
        type: Sequelize.ENUM('in','out','adjustment'),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.DECIMAL(18,6),
        allowNull: false,
      },
      converted_qty: {
        type: Sequelize.DECIMAL(18,6),
        allowNull: false,
      },
      reference: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      note: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    }, {
      engine: 'InnoDB',
      charset: 'utf8mb4',
    });

    await queryInterface.addIndex('store_item_transactions', ['store_id'], { name: 'idx_tx_store' });
    await queryInterface.addIndex('store_item_transactions', ['item_id'], { name: 'idx_tx_item' });
    await queryInterface.addIndex('store_item_transactions', ['measurement_id'], { name: 'idx_tx_measurement' });
  },

  down: async (queryInterface, Sequelize) => {
    // drop enum type safely (Sequelize will handle on many setups)
    await queryInterface.dropTable('store_item_transactions');
  }
};
