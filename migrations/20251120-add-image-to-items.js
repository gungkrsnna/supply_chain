'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Items', 'image', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'relative path to image file under /uploads/items',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Items', 'image');
  }
};
