const express = require("express");
const { register, login } = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Auth routes
router.post("/register", register);
router.post("/login", login);

// Protected route
// router.get("/profile", authMiddleware, (req, res) => {
//   res.json({ message: "Ini halaman profile", user: req.user });
// });

module.exports = router;
