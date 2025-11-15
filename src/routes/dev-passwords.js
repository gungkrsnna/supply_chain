// dev-passwords.js  (atau tonjolkan ke server.js)
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const router = express.Router();

// sesuaikan config DB-mu
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'supply_chain'
};

async function getConn() {
  return await mysql.createConnection(dbConfig);
}

/**
 * GET /dev/users
 * List users (id, name, email) -- untuk ditampilkan di frontend.
 */
router.get('/users', async (req, res) => {
  try {
    const conn = await getConn();
    const [rows] = await conn.execute('SELECT id, name, email FROM users ORDER BY id ASC');
    await conn.end();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /dev/bulk-change-password
 * body: {
 *   updates: [
 *     { id: 1, password: "newpass1" },
 *     { id: 2, password: "newpass2" },
 *     ...
 *   ],
 *   globalPassword: optional string -> if provided, ignore per-row and set this to all listed ids
 * }
 *
 * Response: { updated: [id,...], failed: [{id, error}, ...] }
 */
router.post('/bulk-change-password', async (req, res) => {
  try {
    const { updates, globalPassword } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'updates harus array dan tidak kosong' });
    }

    const conn = await getConn();
    const updated = [];
    const failed = [];

    // gunakan transaksi agar lebih aman (walau ini dev-only)
    await conn.beginTransaction();

    for (const item of updates) {
      try {
        if (!item.id) {
          failed.push({ id: null, error: 'missing id' });
          continue;
        }
        const plain = typeof globalPassword === 'string' && globalPassword.length > 0 ? globalPassword : (item.password || '');
        if (!plain) {
          failed.push({ id: item.id, error: 'password kosong' });
          continue;
        }

        const hashed = await bcrypt.hash(plain, 10);

        // pastikan query menimpa, bukan mengappend
        const [result] = await conn.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, item.id]);
        if (result.affectedRows === 0) {
          failed.push({ id: item.id, error: 'user not found' });
        } else {
          updated.push(item.id);
        }
      } catch (e) {
        failed.push({ id: item.id, error: e.message });
      }
    }

    await conn.commit();
    await conn.end();

    return res.json({ updated, failed });
  } catch (err) {
    console.error('bulk-change-password error', err);
    try { if (conn) await conn.rollback(); } catch(e){/* ignore */ }
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
