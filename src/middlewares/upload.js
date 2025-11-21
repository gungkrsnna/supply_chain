// src/middlewares/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// gunakan project-root/uploads (pastikan app.js juga serve ../uploads)
const UPLOAD_ROOT = path.join(__dirname, '../uploads');
const ITEMS_ROOT = path.join(UPLOAD_ROOT, 'items');

// helper: ensure dir exists (recursive)
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ensure base dirs exist
ensureDir(UPLOAD_ROOT);
ensureDir(ITEMS_ROOT);

// helper hash (safe folder name)
function makeBrandHash(input) {
  if (!input) return 'unknown';
  try {
    return crypto.createHash('md5').update(String(input)).digest('hex');
  } catch (e) {
    return Buffer.from(String(input)).toString('base64').replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 16);
  }
}

// Multer storage: choose subfolder based on item -> brand
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      // default subfolder
      let brandHash = 'unknown';

      // attempt to derive from req.params.id (route: POST /api/item/:id/image)
      const itemId = req.params && (req.params.id || req.params.itemId) ? String(req.params.id || req.params.itemId) : null;

      if (itemId) {
        // lazy-require models to avoid circular deps at module load
        try {
          const models = require('../models');
          const Item = models.Item;
          const Brand = models.Brand;

          const item = await Item.findByPk(itemId, { attributes: ['id', 'brand_id', 'image'] });
          if (item) {
            // brand_id may be null; try to load brand.kode
            if (item.brand_id) {
              const brand = await Brand.findByPk(item.brand_id, { attributes: ['id', 'kode'] });
              if (brand) {
                brandHash = brand.kode ? makeBrandHash(brand.kode) : `brand-id-${brand.id}`;
              }
            } else {
              // no brand_id on item: try to inspect req.body.brandKode or brandKode in query/body
              const bkode = req.body && (req.body.brandKode || req.body.brandKodeRaw || req.query.brandKode);
              if (bkode) {
                brandHash = makeBrandHash(bkode);
              } else {
                brandHash = `item-${item.id}`;
              }
            }
          } else {
            // item not found; fallback to brandKode if provided from body (create flow)
            const bkode = req.body && (req.body.brandKode || req.body.brandKodeRaw || req.query.brandKode);
            if (bkode) brandHash = makeBrandHash(bkode);
            else brandHash = 'unknown';
          }
        } catch (e) {
          // if something fails with DB, fallback gracefully
          console.warn('upload storage: failed to resolve item/brand ->', e && e.message ? e.message : e);
          const bkode = req.body && (req.body.brandKode || req.query.brandKode);
          brandHash = bkode ? makeBrandHash(bkode) : 'unknown';
        }
      } else {
        // no itemId in params: maybe uploading during create with brandKode in body
        const bkode = req.body && (req.body.brandKode || req.query.brandKode || req.body.brand_id);
        brandHash = bkode ? makeBrandHash(bkode) : 'unknown';
      }

      // store brandHash on request for controller later (so controller can save relative path)
      req._uploadSubfolder = brandHash;

      const dest = path.join(ITEMS_ROOT, brandHash);
      ensureDir(dest);
      return cb(null, dest);
    } catch (err) {
      console.error('multer destination error', err);
      return cb(err);
    }
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = uuidv4() + ext;
    cb(null, name);
  }
});

// file filter
function fileFilter(req, file, cb) {
  const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    // pass multer error
    return cb(new Error('Invalid file type. Allowed: png, jpg, jpeg, webp'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2 MB
});

// export useful constants
module.exports = { upload, UPLOAD_ROOT, ITEMS_ROOT };
