require('dotenv').config();

module.exports = {
  SECRET_KEY: process.env.JWT_SECRET, // nanti bisa pakai dotenv
};