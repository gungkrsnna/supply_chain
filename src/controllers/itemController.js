// src/controllers/itemController.js
// Implementation consistent: module.exports = { ... }

const itemService = require("../services/itemService");
const categoryItemService = require("../services/categoryitemService");
const uomService = require("../services/uomService");

// src/controllers/itemController.js  (paste this at the top)
"use strict";

const models = require("../models"); // access to all models: models.Item, models.ItemMeasurement, models.Uom, models.CategoryItem, models.Brand...
const { Op } = require("sequelize");

// convenience references (optional)
const Item = models.Item;
const ItemMeasurement = models.ItemMeasurement;
const Uom = models.Uom;
const CategoryItem = models.CategoryItem;
const Brand = models.Brand;



// createItem (patch)
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
    return res.status(200).json({
      success: true,
      message: "Item retrieved successfully",
      data: item,
    });
  } catch (error) {
    // show full stack in server console for debugging
    console.error("getItemById ERROR:", error && error.stack ? error.stack : error);

    const isDev = process.env.NODE_ENV !== "production";
    return res.status(500).json({
      success: false,
      message: isDev ? (error && (error.message || String(error))) : "Failed to retrieve item",
      // only include stack in dev response (optional)
      error: isDev ? (error && error.stack ? error.stack : String(error)) : undefined
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
    const brand = await db.Brand.findByPk(brandId);
    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand tidak ditemukan",
      });
    }

    // ambil item terakhir dengan prefix brand tersebut
    const lastItem = await db.Item.findOne({
      where: {
        code: { [db.Sequelize.Op.like]: `${brand.kode}.FG.%` }
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
    const newItem = await db.Item.create({
      code: newCode,
      name,
      description,
      uom_id,
      category_item_id,
      is_production: true,
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

    // if no query, return a small set (or you can return empty array)
    if (!qRaw) {
      const rows = await models.Item.findAll({
        limit: 200,
        order: [["name", "ASC"]],
        include: [
          { model: models.ItemMeasurement, as: "measurements", include: [{ model: models.Uom, as: "uom" }] }
        ]
      });
      return res.json({ success: true, data: rows });
    }

    // prefer exact code match first
    const exact = await models.Item.findAll({
      where: { code: qRaw },
      limit: 50,
      include: [
        { model: models.ItemMeasurement, as: "measurements", include: [{ model: models.Uom, as: "uom" }] }
      ]
    });
    if (exact && exact.length) {
      return res.json({ success: true, data: exact });
    }

    // fuzzy match on name or code
    const dialect = models.sequelize.getDialect();
    const likeOp = dialect === "postgres" ? Op.iLike : Op.like;
    const pattern = `%${qRaw}%`;

    const rows = await models.Item.findAll({
      where: {
        [Op.or]: [
          { name: { [likeOp]: pattern } },
          { code: { [likeOp]: pattern } }
        ]
      },
      limit: 200,
      order: [["name", "ASC"]],
      include: [
        { model: models.ItemMeasurement, as: "measurements", include: [{ model: models.Uom, as: "uom" }] }
      ]
    });

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("listItems error:", err);
    return res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
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



module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  createFgForBrand,
  listItems,
  getMeasurementsByItem
};
