"use strict";
const bcrypt = require("bcryptjs");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    return queryInterface.bulkInsert("users", [
      {
        name: "admin",
        email: "admin@example.com",
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete(
      "users",
      { email: "admin@example.com" },
      {}
    );
  },
};
