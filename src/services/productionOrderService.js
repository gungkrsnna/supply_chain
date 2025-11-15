// src/services/productionOrderService.js
const models = require("../models");
const { Sequelize } = require("sequelize");

// prefer several possible model names (sesuaikan dengan exports di models/index.js)
const POModel =
  models.DailyProduction ||
  models.dailyProduction ||
  models.ProductionOrder ||
  models.productionorder ||
  null;

function toPlain(i) {
  if (!i) return null;
  if (typeof i.toJSON === "function") return i.toJSON();
  return i.dataValues ? i.dataValues : i;
}

/**
 * Basic finder: semua record (opsional filter store/date)
 */
async function findByStoreAndDate(storeId = null, date = null) {
  if (!POModel) {
    console.warn("productionOrderService: model not found.");
    return [];
  }

  const where = {};
  if (storeId) where.store_id = storeId;
  if (date) where.date = date;

  const rows = await POModel.findAll({ where, order: [["id", "ASC"]] });
  return rows.map(toPlain);
}

/**
 * Create
 */
async function create(payload) {
  if (!POModel) throw new Error("ProductionOrder model not available");
  const created = await POModel.create(payload);
  return toPlain(created);
}

/**
 * Update by id
 */
async function update(id, payload) {
  if (!POModel) throw new Error("ProductionOrder model not available");
  const inst = await POModel.findByPk(id);
  if (!inst) return null;
  const updated = await inst.update(payload);
  return toPlain(updated);
}

/**
 * Delete by id
 */
async function remove(id) {
  if (!POModel) throw new Error("ProductionOrder model not available");
  const inst = await POModel.findByPk(id);
  if (!inst) return false;
  await inst.destroy();
  return true;
}

/**
 * Aggregate totals per store (optional)
 */
async function aggregateTotalsByDate(date = null) {
  if (!POModel) return [];

  const where = {};
  if (date) where.date = date;

  const rows = await POModel.findAll({
    attributes: [
      "store_id",
      [Sequelize.fn("SUM", Sequelize.col("quantity")), "total_quantity"],
    ],
    where,
    group: ["store_id"],
    order: [["store_id", "ASC"]],
    raw: true,
  });

  return rows.map((r) => ({
    store_id: Number(r.store_id),
    total_quantity: Number(r.total_quantity),
  }));
}

/**
 * Aggregate totals by item (with item name if Item model exists)
 * returns array: { item_id, item_name, total_quantity }
 */
async function aggregateTotalsByItem(date = null) {
  if (!POModel) return [];

  const where = {};
  if (date) where.date = date;

  const includeItem = models.Item ? {
    model: models.Item,
    as: "item",
    attributes: ["id", "name"], // ubah 'name' bila field berbeda
    required: false,
  } : null;

  const rows = await POModel.findAll({
    attributes: [
      "item_id",
      [Sequelize.fn("SUM", Sequelize.col("quantity")), "total_quantity"],
    ],
    where,
    include: includeItem ? [includeItem] : [],
    // group must include included cols when not using raw
    group: includeItem ? ["item_id", "item.id", "item.name"] : ["item_id"],
    order: [[Sequelize.literal("total_quantity"), "DESC"]],
  });

  return rows.map((r) => {
    const totalRaw = r.get ? r.get("total_quantity") : r.total_quantity;
    return {
      item_id: Number(r.item_id),
      item_name: r.item ? r.item.name : null,
      total_quantity: Number(totalRaw),
    };
  });
}

/**
 * Breakdown per item for a given store + date
 */
async function aggregateBreakdownByStoreAndDate(storeId, date = null) {
  if (!POModel) return [];
  if (!storeId) return [];

  const where = { store_id: storeId };
  if (date) where.date = date;

  const rows = await POModel.findAll({
    attributes: [
      "item_id",
      [Sequelize.fn("SUM", Sequelize.col("quantity")), "total_quantity"],
    ],
    where,
    group: ["item_id"],
    order: [["item_id", "ASC"]],
    raw: true,
  });

  return rows.map((r) => ({ item_id: Number(r.item_id), total_quantity: Number(r.total_quantity) }));
}

module.exports = {
  findByStoreAndDate,
  create,
  update,
  delete: remove,
  aggregateTotalsByDate,
  aggregateTotalsByItem, // <- pastikan diekspor
  aggregateBreakdownByStoreAndDate,
};
