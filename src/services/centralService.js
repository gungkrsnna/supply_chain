// services/centralService.js
"use strict";

const { Op } = require("sequelize");
const models = require("../models");
const itemService = require("../services/itemService"); // jika ada

async function getCentralItem(storeId, itemId) {
  return models.CentralItem.findOne({ where: { store_id: storeId, item_id: itemId } });
}

async function findCentralItems(storeId, { q = "", limit = 200 } = {}) {
  const whereItem = {};
  if (q) {
    whereItem[Op.or] = [
      { code: { [Op.like]: `%${q}%` } },
      { name: { [Op.like]: `%${q}%` } },
    ];
  }

  return models.CentralItem.findAll({
    where: { store_id: storeId },
    include: [{ model: models.Item, as: "item", where: whereItem, required: !!q }],
    limit,
  });
}

async function adjustStock(storeId, itemId, deltaQty, { type = "adjustment", note = null, measurement_id = null, reference = null, t = null, meta = null, actorId = null } = {}) {
  const sequelize = models.sequelize;
  const transactionProvided = !!t;
  const trx = t || await sequelize.transaction();

  try {
    let centralItem = await models.CentralItem.findOne({ where: { store_id: storeId, item_id: itemId }, transaction: trx, lock: trx.LOCK.UPDATE });
    if (!centralItem) {
      centralItem = await models.CentralItem.create({ store_id: storeId, item_id: itemId, stock: 0 }, { transaction: trx });
    }

    // convert measurement to base if needed
    let convertedDelta = Number(deltaQty);
    if (measurement_id && typeof itemService.convertToBase === "function") {
      const maybe = await itemService.convertToBase(itemId, deltaQty, measurement_id);
      if (!Number.isNaN(Number(maybe))) convertedDelta = Number(maybe);
    }

    const newStock = Number(centralItem.stock) + Number(convertedDelta);
    if (newStock < 0) {
      throw new Error("Insufficient stock in central");
    }
    centralItem.stock = newStock;
    await centralItem.save({ transaction: trx });

    // create transaction record with store_id
    await models.CentralItemTransaction.create({
      store_id: storeId,
      item_id: itemId,
      measurement_id: measurement_id || null,
      type,
      quantity: measurement_id ? deltaQty : null,
      converted_qty: convertedDelta,
      reference: reference || null,
      note,
      measurement_breakdown: meta?.measurement_breakdown ?? null,
      operator_id: actorId || null,
      meta
    }, { transaction: trx });

    if (!transactionProvided) await trx.commit();
    return centralItem;
  } catch (err) {
    if (!transactionProvided) await trx.rollback();
    throw err;
  }
}

module.exports = {
  getCentralItem,
  findCentralItems,
  adjustStock
};
