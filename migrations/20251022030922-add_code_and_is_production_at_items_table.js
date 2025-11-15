"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn("items", "code", {
      type: Sequelize.STRING,
      allowNull: true,
      after: "uom_id",
      unique: true,
    });
    await queryInterface.addColumn("items", "is_production", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      after: "description",
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("items", "code");
    await queryInterface.removeColumn("items", "is_production");
  },
};
