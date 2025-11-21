// src/controllers/itemController.js
"use strict";

const itemService = require("../services/itemService");
const categoryItemService = require("../services/categoryitemService");
const uomService = require("../services/uomService");

const fs = require('fs');
const path = require('path');
// middleware sekarang mengekspor ITEMS_ROOT dan UPLOAD_ROOT
const { UPLOAD_ROOT, ITEMS_ROOT } = require('../middlewares/upload');


const models = require("../models"); // access to models: Item, ItemMeasurement, Uom, CategoryItem, Brand...
const { Op } = require("sequelize");

// convenience references (optional)
const Item = models.Item;
const ItemMeasurement = models.ItemMeasurement;
const Uom = models.Uom;
const CategoryItem = models.CategoryItem;
const Brand = models.Brand;

/**
 * parseIsProductionRaw
 * kembalikan 1 | 0 | undefined
 */
function parseIsProductionRaw(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes"].includes(s)) return 1;
  if (["0", "false", "no"].includes(s)) return 0;
  return undefined;
}

function makeImageUrl(req, imagePath) {
  if (!imagePath) return null;
  const base = `${req.protocol}://${req.get('host')}`;

  // normalize value
  let rel = String(imagePath || '').replace(/^\/+/, ''); // remove leading slash(es)

  // If DB already contains "uploads/" prefix, use it directly
  if (rel.startsWith('uploads/')) {
    // ensure posix slashes
    return `${base}/${rel.split(path.sep).join('/')}`;
  }

  // If DB already contains "items/" prefix, prefix with uploads/
  if (rel.startsWith('items/')) {
    return `${base}/${rel.split(path.sep).join('/')}`;
  }

  // Otherwise assume stored as "brandHash/filename" or just "filename"
  // Serve under /uploads/items/<rel>
  const urlPath = path.posix.join('uploads', 'items', rel);
  return `${base}/${urlPath}`;
}



async function createItem(req, res) {
  try {
    const {
      request_category_id,
      category_item_id,
      uom_id,
      code,
      name,
      description,
      is_production,
      brandKode,
      codePrefix,
      measurement_units // optional
    } = req.body;

    // allow request_category_id === 0, only reject if undefined or null
    if (request_category_id === undefined || request_category_id === null || !category_item_id || !uom_id || !name) {
      return res.status(400).json({
        success: false,
        message:
          "request_category_id, category_item_id, uom_id, and name are required",
        data: null,
      });
    }

    const categoryExists = await categoryItemService.getCategoryItemById(
      category_item_id
    );
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "category_item_id not found",
        data: null,
      });
    }

    const uomExists = await uomService.getUomById(uom_id);
    if (!uomExists) {
      return res.status(400).json({
        success: false,
        message: "uom_id not found",
        data: null,
      });
    }

    // validate measurement_units (optional)
    if (Array.isArray(measurement_units)) {
      for (const mu of measurement_units) {
        if (mu.uom_id === undefined || mu.value === undefined) {
          return res.status(400).json({
            success: false,
            message: "measurement_units must include uom_id and value",
            data: null,
          });
        }
        const existsU = await uomService.getUomById(mu.uom_id);
        if (!existsU) {
          return res.status(400).json({
            success: false,
            message: `uom_id ${mu.uom_id} not found in measurement_units`,
            data: null,
          });
        }
      }
    }

    // If no code provided, brandKode is required for auto-generation
    if (!code && !brandKode) {
      return res.status(400).json({
        success: false,
        message: "brandKode is required when code is not provided",
        data: null
      });
    }

    const item = await itemService.createItem({
      request_category_id,
      category_item_id,
      uom_id,
      code,
      name,
      description,
      is_production,
      brandKode,
      codePrefix,
      measurement_units
    });

    const data = await itemService.getItemById(item.id);
    res.status(201).json({
      success: true,
      message: "Item created successfully",
      data: data,
    });
  } catch (error) {
    // handle unique constraint / duplicate code more explicitly
    if (error && (error.name === 'SequelizeUniqueConstraintError' || (error.message && error.message.toLowerCase().includes('already exists')))) {
      return res.status(409).json({
        success: false,
        message: error.message || "Code already exists",
        data: null,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create item",
      data: null,
    });
  }
}

async function updateItem(req, res) {
  try {
    const {
      request_category_id,
      category_item_id,
      uom_id,
      code,
      name,
      description,
      is_production,
      measurement_units // optional
    } = req.body;

    // allow request_category_id === 0, only reject if undefined or null
    if (request_category_id === undefined || request_category_id === null || !category_item_id || !uom_id || !name) {
      return res.status(400).json({
        success: false,
        message:
          "request_category_id, category_item_id, uom_id, and name are required",
        data: null,
      });
    }

    const categoryExists = await categoryItemService.getCategoryItemById(
      category_item_id
    );
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: "category_item_id not found",
        data: null,
      });
    }

    const uomExists = await uomService.getUomById(uom_id);
    if (!uomExists) {
      return res.status(400).json({
        success: false,
        message: "uom_id not found",
        data: null,
      });
    }

    // validate measurement_units (optional)
    if (Array.isArray(measurement_units)) {
      for (const mu of measurement_units) {
        if (mu.uom_id === undefined || mu.value === undefined) {
          return res.status(400).json({
            success: false,
            message: "measurement_units must include uom_id and value",
            data: null,
          });
        }
        const existsU = await uomService.getUomById(mu.uom_id);
        if (!existsU) {
          return res.status(400).json({
            success: false,
            message: `uom_id ${mu.uom_id} not found in measurement_units`,
            data: null,
          });
        }
      }
    }

    const item = await itemService.updateItem(req.params.id, {
      request_category_id,
      category_item_id,
      uom_id,
      code,
      name,
      description,
      is_production,
      measurement_units
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
        data: null,
      });
    }

    const data = await itemService.getItemById(item.id);

    res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: data,
    });
  } catch (error) {
    if (error && (error.name === 'SequelizeUniqueConstraintError' || (error.message && error.message.toLowerCase().includes('already exists')))) {
      return res.status(409).json({
        success: false,
        message: error.message || "Code already exists",
        data: null,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update item",
      data: null,
    });
  }
}

async function getAllItems(req, res) {
  try {
    const items = await itemService.getAllItems();
    res.status(200).json({
      success: true,
      message: "Items retrieved successfully",
      data: items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve items",
      data: null,
    });
  }
}

async function getItemById(req, res) {
  try {
    console.log("getItemById called id=", req.params.id);
    const item = await itemService.getItemById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
        data: null,
      });
    }

    const plain = item.get ? item.get({ plain: true }) : item;
    // normalize for client shape and keep measurements/uom normalized
    const normalized = normalizeItemForClient(plain);
    normalized.image_url = makeImageUrl(req, normalized.image);

    return res.status(200).json({
      success: true,
      message: "Item retrieved successfully",
      data: normalized,
    });
  } catch (error) {
    // show full stack in server console for debugging
    console.error("getItemById ERROR:", error && error.stack ? error.stack : error);

    const isDev = process.env.NODE_ENV !== "production";
    return res.status(500).json({
      success: false,
      message: isDev ? (error && (error.message || String(error))) : "Failed to retrieve item",
      error: isDev ? (error && error.stack ? error.stack : String(error)) : undefined,
    });
  }
}


async function deleteItem(req, res) {
  try {
    const deleted = await itemService.deleteItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
        data: null,
      });
    }
    res.status(200).json({
      success: true,
      message: "Item deleted successfully",
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete item",
      data: null,
    });
  }
}


async function createFgForBrand(req, res) {
  try {
    const { brandId } = req.params;
    const { name, description, category_item_id, uom_id } = req.body;

    if (!name || !category_item_id || !uom_id) {
      return res.status(400).json({
        success: false,
        message: "name, category_item_id, dan uom_id wajib diisi",
      });
    }

    // ambil kode brand dari tabel Brand
    const brand = await Brand.findByPk(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand tidak ditemukan",
      });
    }

    // ambil item terakhir dengan prefix brand tersebut
    const lastItem = await Item.findOne({
      where: {
        code: { [Op.like]: `${brand.kode}.FG.%` }
      },
      order: [['id', 'DESC']]
    });

    // tentukan nomor urut berikutnya
    let nextNumber = 1;
    if (lastItem && lastItem.code) {
      const parts = lastItem.code.split('.');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) nextNumber = lastNum + 1;
    }

    // format code baru, misalnya RG.FG.SR.16.007
    const newCode = `${brand.kode}.FG.SR.16.${String(nextNumber).padStart(3, '0')}`;

    // buat item baru (FG)
    const newItem = await Item.create({
      code: newCode,
      name,
      description,
      uom_id,
      category_item_id,
      is_production: 1,
    });

    res.status(201).json({
      success: true,
      message: "FG berhasil dibuat",
      data: newItem,
    });

  } catch (err) {
    console.error("Error createFgForBrand:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Gagal membuat FG baru",
    });
  }
}

async function listItems(req, res) {
  try {
    const qRaw = (req.query.search || req.query.q || "").toString().trim();

    // parse is_production
    const isProductionRaw = req.query.is_production;
    const isProduction = parseIsProductionRaw(isProductionRaw);

    // base where filter from query params (only include is_production if provided)
    const whereBase = {};
    if (isProduction !== undefined) {
      whereBase.is_production = isProduction;
    }

    // common include: include ItemMeasurement + Uom, and include Item.uom
    const commonInclude = [
      {
        model: ItemMeasurement,
        as: "measurements",
        include: [{ model: Uom, as: "uom", attributes: ["id", "name"] }],
      },
      {
        model: Uom,
        as: "uom",
        attributes: ["id", "name"],
        required: false,
      },
    ];

    // NO QUERY -> return a small set but obey is_production filter if set
    if (!qRaw) {
      const rows = await Item.findAll({
        where: whereBase,
        limit: 200,
        order: [["name", "ASC"]],
        include: commonInclude,
      });

      const plain = rows.map((r) => r.get({ plain: true })).map(normalizeItemForClient);
      // add image_url using request host
      plain.forEach((p) => {
        p.image_url = makeImageUrl(req, p.image);
      });

      if (plain.length) console.log("listItems sample:", JSON.stringify(plain[0], null, 2));

      return res.json({ success: true, data: plain });
    }

    // EXACT CODE MATCH
    const exact = await Item.findAll({
      where: { code: qRaw, ...whereBase },
      limit: 50,
      include: commonInclude,
    });
    if (exact && exact.length) {
      const plain = exact.map((r) => r.get({ plain: true })).map(normalizeItemForClient);
      plain.forEach((p) => {
        p.image_url = makeImageUrl(req, p.image);
      });

      if (plain.length) console.log("listItems exact sample:", JSON.stringify(plain[0], null, 2));
      return res.json({ success: true, data: plain });
    }

    // FUZZY MATCH
    const dialect = models.sequelize.getDialect();
    const likeOp = dialect === "postgres" ? Op.iLike : Op.like;
    const pattern = `%${qRaw}%`;

    const rows = await Item.findAll({
      where: {
        ...whereBase,
        [Op.or]: [{ name: { [likeOp]: pattern } }, { code: { [likeOp]: pattern } }],
      },
      limit: 200,
      order: [["name", "ASC"]],
      include: commonInclude,
    });

    const plain = rows.map((r) => r.get({ plain: true })).map(normalizeItemForClient);
    plain.forEach((p) => {
      p.image_url = makeImageUrl(req, p.image);
    });

    if (plain.length) console.log("listItems fuzzy sample:", JSON.stringify(plain[0], null, 2));

    return res.json({ success: true, data: plain });
  } catch (err) {
    console.error("listItems error:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
}

/**
 * normalizeItemForClient(itemPlain)
 * memastikan shape konsisten:
 * - item.uom => { id, name } atau null
 * - item.measurements => array of { id, uom: {id,name}, value, uom_id }
 */
function normalizeItemForClient(item) {
  // ensure top-level uom
  if (item.uom && typeof item.uom === "object") {
    item.uom = { id: item.uom.id, name: item.uom.name ?? null };
  } else if (item.uom_id) {
    // fallback: keep id but name unknown
    item.uom = { id: item.uom_id, name: null };
  } else {
    item.uom = null;
  }

  // normalize measurements
  if (Array.isArray(item.measurements)) {
    item.measurements = item.measurements.map(m => {
      const u = m.uom && typeof m.uom === "object" ? { id: m.uom.id, name: m.uom.name ?? null } :
                (m.uom_id ? { id: m.uom_id, name: null } : null);
      return {
        id: m.id,
        uom_id: m.uom_id ?? (u && u.id) ?? null,
        uom: u,
        value: m.value ?? null,
        // keep other fields you need, or remove sensitive ones
      };
    });
  } else {
    item.measurements = [];
  }

  return item;
}

async function getMeasurementsByItem(req, res) {
  try {
    const itemId = Number(req.params.id);
    if (!itemId) return res.status(400).json({ success:false, message: 'Invalid item id' });

    // gunakan model yang sudah dideklarasi di atas: ItemMeasurement, Uom
    const rows = await ItemMeasurement.findAll({
      where: { item_id: itemId },
      include: [{ model: Uom, as: 'uom', required: false }]
    });

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('getMeasurementsByItem error', err);
    return res.status(500).json({ success:false, message: err.message });
  }
}

async function uploadItemImage(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success:false, message: 'Invalid item id' });

    // multer should have processed file
    if (!req.file) {
      return res.status(400).json({ success:false, message: 'Image file is required (field name: image)' });
    }

    // load item
    const item = await Item.findByPk(id);
    if (!item) {
      // remove uploaded file (orphan) - attempt to remove using req.file.path if exists
      try { if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch(e) {}
      return res.status(404).json({ success:false, message: 'Item not found' });
    }

    // determine relative path to store in DB
    // middleware upload.js sets req._uploadSubfolder to brandHash (see middleware)
    const sub = req._uploadSubfolder || '';
    // use posix join to ensure forward slashes for URL
    const relativePath = sub ? path.posix.join(sub, req.file.filename) : req.file.filename;

    // remove old image file if exists (old value could be 'filename' or 'brandHash/filename')
    if (item.image) {
      try {
        // item.image is stored relative to ITEMS_ROOT (e.g. 'brandHash/uuid.jpg' or 'uuid.jpg')
        const oldRel = String(item.image || '').replace(/^\/+/, '');
        const oldFullPath = path.join(ITEMS_ROOT, oldRel);
        if (fs.existsSync(oldFullPath)) {
          fs.unlinkSync(oldFullPath);
          console.log('Removed old image', oldFullPath);
        }
      } catch (e) {
        console.warn('Failed to remove old image', e && e.message ? e.message : e);
      }
    }

    // persist new relative path to DB (so DB.image = 'brandHash/filename')
    await item.update({ image: relativePath });

    const data = (await item.reload()).get({ plain: true });
    data.image_url = makeImageUrl(req, data.image);

    return res.status(200).json({ success:true, message: 'Image uploaded', data });
  } catch (err) {
    console.error('uploadItemImage error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success:false, message: err.message || 'Failed to upload image' });
  }
}


async function deleteItemImage(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success:false, message: 'Invalid item id' });

    const item = await Item.findByPk(id);
    if (!item) return res.status(404).json({ success:false, message: 'Item not found' });

    if (!item.image) return res.status(400).json({ success:false, message: 'Item has no image' });

    const rel = String(item.image).replace(/^\/+/, '');
    const filepath = path.join(ITEMS_ROOT, rel);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log('Deleted image file', filepath);
    } else {
      console.warn('deleteItemImage: file not found', filepath);
    }

    await item.update({ image: null });

    return res.json({ success:true, message:'Image deleted' });
  } catch (err) {
    console.error('deleteItemImage error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success:false, message: err.message || 'Failed to delete image' });
  }
}



module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  createFgForBrand,
  listItems,
  getMeasurementsByItem,
  uploadItemImage,
  deleteItemImage
};
