const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config/jwt");
const userService = require("../services/userService");
const roleService = require('../services/roleService');

// REGISTER
// exports.register = async (req, res) => {
//   const { name, email, password } = req.body;

//   const existingUser = await userService.findUserByEmail(email);
//   if (existingUser) {
//     return res.status(400).json({ message: "Email sudah digunakan!" });
//   }

//   const hashedPassword = await bcrypt.hash(password, 10);
//   await userService.createUser({ name, email, password: hashedPassword });

//   res.json({ message: "Register berhasil!" });
// };

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await userService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Email sudah digunakan!" });
    }

    // ambil role default (misal role bernama 'user' — sesuaikan)
    let role = await roleService.getRoleByName('user');
    if (!role) {
      // fallback: ambil role pertama jika tidak ada yang namanya 'user'
      const roles = await roleService.getAllRoles();
      role = roles && roles.length ? roles[0] : null;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // tambahkan role_id ke payload createUser
    const payload = {
      name,
      email,
      password: hashedPassword,
      role_id: role ? role.id : null  // role_id harus tidak null jika model require
    };

    await userService.createUser(payload);

    res.json({ message: "Register berhasil!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server', error: err.message });
  }
};

// LOGIN
// LOGIN (patched)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await userService.findUserByEmail(email);
    console.log("✅ User fetched:", JSON.stringify(user, null, 2)); // debug

    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan!" });
    }

    // --- sanitize stored password before compare ---
    // handle case ada whitespace/newline atau hash digabung
    let stored = String(user.password || '').trim();

    // jika ada beberapa hash digabung, ambil match terakhir yang mirip bcrypt ($2a|$2b|$2y + 56 chars)
    // regex mencari semua match bcrypt lalu ambil yang terakhir
    const matches = stored.match(/\$2[aby]\$.{56}/g);
    if (matches && matches.length > 0) {
      stored = matches[matches.length - 1];
      console.log('ℹ️ Using extracted bcrypt hash from stored value.');
    }

    const validPassword = await bcrypt.compare(password, stored);
    if (!validPassword) {
      return res.status(401).json({ message: "Password salah!" });
    }

    // create safe user (jangan kirim password)
    // kalau user adalah instance ORM, ambil plain object
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role ? {
        id: user.role.id,
        name: user.role.name,
        role_permissions: user.role.role_permissions || []
      } : null,
      store_id: user.store_id
    };

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: safeUser.role,
        store_id: user.store_id,
      },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    // kembalikan user dan token di body (frontend cari user & token)
    return res.json({
      message: "Login berhasil!",
      user: safeUser,
      permissions: safeUser.role ? safeUser.role.role_permissions : [],
      token,
    });
  } catch (err) {
    console.error("❌ ERROR DETAIL:", err);
    return res
      .status(500)
      .json({ message: "Terjadi kesalahan server", error: err.message });
  }
};

