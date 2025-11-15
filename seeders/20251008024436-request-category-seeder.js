"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
     */
    await queryInterface.bulkInsert("Request_Categories", [
      {
        name: "Raw Material",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Semi Finished-Goods",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Finished-Goods",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "Other",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.bulkDelete("Request_Categories", { name: "Rice" }, {});
  },
};
