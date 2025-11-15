// src/services/storeInventoryService.js
const models = require('../models');
const sequelize = models.sequelize;
const { Sequelize } = require('sequelize');

async function listStores() {
  // Return simple list of stores
  if (models.Store) {
    return models.Store.findAll({
      attributes: ['id', 'name'], // ⚙️ hapus branch_code
      order: [['name', 'ASC']],
    });
  }
}

async function getInventoryForStore(storeId) {
  // Return only non-production items (is_production = 0)
  if (models.StoreInventory && models.Item) {
    const rows = await models.StoreInventory.findAll({
      where: { store_id: storeId },
      order: [['id', 'ASC']],
      include: [
        {
          model: models.Item,
          as: 'item',
          attributes: ['id', 'name', 'is_production'],
          where: { is_production: 0 }, // ✅ filter di join
          required: false, // biarkan inventory tanpa item tetap muncul
        },
      ],
    });

    return rows.map((r) => {
      const o = r.toJSON();
      return {
        id: o.id,
        product_name: o.product_name ?? (o.item ? o.item.name : null),
        qty: o.qty,
        unit: o.unit,
        min_stock: o.min_stock,
        note: o.note,
        item_id: o.item_id,
        raw: o,
      };
    });
  }

  // Fallback raw query
  const rows = await sequelize.query(
    `
    SELECT i.*, it.name AS item_name, it.is_production
    FROM inventories i
    LEFT JOIN items it ON it.id = i.item_id
    WHERE i.store_id = ? AND (it.is_production = 0 OR it.is_production IS NULL)
    ORDER BY i.id
    `,
    { replacements: [storeId], type: Sequelize.QueryTypes.SELECT }
  );

  return rows.map((r) => ({
    id: r.id,
    product_name: r.product_name ?? r.item_name ?? null,
    qty: r.quantity ?? r.qty ?? 0,
    unit: r.unit ?? null,
    min_stock: r.min_stock ?? null,
    note: r.note ?? null,
    item_id: r.item_id ?? null,
    raw: r,
  }));
}


/**
 * Create single inventory item (storeId required).
 * payload: { product_name, qty, unit, min_stock, note, item_id? }
 */
async function createInventoryItem(storeId, payload) {
  if (!models.StoreInventory) {
    const q = `INSERT INTO inventories (store_id, item_id, product_name, quantity, unit, min_stock, note, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
    const replacements = [storeId, payload.item_id || null, payload.product_name || null, payload.qty || 0, payload.unit || null, payload.min_stock || null, payload.note || null];
    await sequelize.query(q, { replacements });
    const last = (await sequelize.query("SELECT LAST_INSERT_ID() as id", { type: Sequelize.QueryTypes.SELECT }))[0];
    return { id: last.id };
  }
  const rec = await models.StoreInventory.create({
    store_id: storeId,
    item_id: payload.item_id || null,
    product_name: payload.product_name || null,
    qty: payload.qty || 0,
    unit: payload.unit || null,
    min_stock: payload.min_stock || null,
    note: payload.note || null,
  });
  return rec.toJSON();
}

/**
 * Update single inventory row
 */
async function updateInventoryItem(storeId, inventoryId, payload) {
  if (models.StoreInventory) {
    const rec = await models.StoreInventory.findOne({ where: { id: inventoryId, store_id: storeId } });
    if (!rec) throw new Error('not_found');
    await rec.update({
      product_name: payload.product_name ?? rec.product_name,
      qty: payload.qty ?? rec.qty,
      unit: payload.unit ?? rec.unit,
      min_stock: payload.min_stock ?? rec.min_stock,
      note: payload.note ?? rec.note,
      item_id: payload.item_id ?? rec.item_id,
    });
    return rec.toJSON();
  }
  // raw fallback
  const setParts = [];
  const replacements = [];
  if ('product_name' in payload) { setParts.push("product_name = ?"); replacements.push(payload.product_name); }
  if ('qty' in payload) { setParts.push("quantity = ?"); replacements.push(payload.qty); }
  if ('unit' in payload) { setParts.push("unit = ?"); replacements.push(payload.unit); }
  if ('min_stock' in payload) { setParts.push("min_stock = ?"); replacements.push(payload.min_stock); }
  if ('note' in payload) { setParts.push("note = ?"); replacements.push(payload.note); }
  if ('item_id' in payload) { setParts.push("item_id = ?"); replacements.push(payload.item_id); }
  if (setParts.length === 0) return null;
  replacements.push(inventoryId, storeId);
  const q = `UPDATE inventories SET ${setParts.join(', ')}, updatedAt = NOW() WHERE id = ? AND store_id = ?`;
  await sequelize.query(q, { replacements });
  return { id: inventoryId };
}

/**
 * Delete inventory
 */
async function deleteInventoryItem(storeId, inventoryId) {
  if (models.StoreInventory) {
    const rec = await models.StoreInventory.findOne({ where: { id: inventoryId, store_id: storeId } });
    if (!rec) throw new Error('not_found');
    await rec.destroy();
    return true;
  }
  await sequelize.query("DELETE FROM inventories WHERE id = ? AND store_id = ?", { replacements: [inventoryId, storeId] });
  return true;
}

/**
 * Bulk upsert replacement: the frontend sends full array of items for the store.
 * Strategy: transaction: delete rows that were removed (by id), update existing by id, insert new ones.
 * Use `items` array where each item may contain id (existing) or temp id (new).
 */
async function bulkReplaceInventory(storeId, items) {
  return sequelize.transaction(async (t) => {
    // fetch existing ids for store
    const existing = await sequelize.query("SELECT id FROM inventories WHERE store_id = ?", {
      replacements: [storeId], type: Sequelize.QueryTypes.SELECT, transaction: t
    });
    const existingIds = new Set(existing.map(r => Number(r.id)));

    const incomingIds = new Set(items.filter(i => i && i.id && !String(i.id).startsWith('tmp-')).map(i => Number(i.id)));
    // delete removed
    const toDelete = [...existingIds].filter(id => !incomingIds.has(id));
    if (toDelete.length) {
      await sequelize.query(`DELETE FROM inventories WHERE id IN (${toDelete.map(() => '?').join(',')}) AND store_id = ?`, {
        replacements: [...toDelete, storeId], transaction: t
      });
    }

    // upsert each incoming
    for (const it of items) {
      if (it.id && !String(it.id).startsWith('tmp-') && existingIds.has(Number(it.id))) {
        // update
        await sequelize.query(
          `UPDATE inventories SET product_name = ?, quantity = ?, unit = ?, min_stock = ?, note = ?, item_id = ?, updatedAt = NOW() WHERE id = ? AND store_id = ?`,
          { replacements: [it.product_name || null, it.qty || 0, it.unit || null, it.min_stock || null, it.note || null, it.item_id || null, it.id, storeId], transaction: t }
        );
      } else {
        // insert new
        await sequelize.query(
          `INSERT INTO inventories (store_id, item_id, product_name, quantity, unit, min_stock, note, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          { replacements: [storeId, it.item_id || null, it.product_name || null, it.qty || 0, it.unit || null, it.min_stock || null, it.note || null], transaction: t }
        );
      }
    }

    // return new list
    const rows = await sequelize.query("SELECT * FROM inventories WHERE store_id = ? ORDER BY id", { replacements: [storeId], type: Sequelize.QueryTypes.SELECT, transaction: t });
    return rows;
  });
}

module.exports = {
  listStores,
  getInventoryForStore,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  bulkReplaceInventory,
};
