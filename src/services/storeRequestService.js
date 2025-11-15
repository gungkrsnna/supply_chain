// services/storeRequestService.js
"use strict";

const models = require("../models");
const { sequelize } = models;
const { StoreRequest, StoreRequestItem, Item, Store } = models;

module.exports = {
  // simple code generator: SR-YYYYMM-XXXX
  async generateRequestCode() {
    const prefix = `SR-${(new Date()).toISOString().slice(0,7).replace('-', '')}`; // SR-YYYYMM
    // count requests this month
    const like = `${prefix}%`;
    const count = await StoreRequest.count({ where: { request_code: { [models.Sequelize.Op.like]: like } } });
    const seq = String(count + 1).padStart(4, "0");
    return `${prefix}-${seq}`;
  },

  async createStoreRequest({ storeId, createdBy = null, note = null, items = [] }) {
    if (!storeId) throw new Error("storeId is required");
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("At least one item must be requested");
    }

    // validate store exists
    const store = await Store.findByPk(storeId);
    if (!store) throw new Error("Store not found");

    // validate items: exist and are non-production (is_production false/0)
    // load all referenced item ids in one query
    const itemIds = [...new Set(items.map(i => Number(i.item_id)).filter(Boolean))];
    if (itemIds.length === 0) throw new Error("No valid item_id provided in items");

    const dbItems = await Item.findAll({ where: { id: itemIds } });
    const dbItemsById = {};
    dbItems.forEach(it => { dbItemsById[it.id] = it; });

    for (const it of items) {
      const iid = Number(it.item_id);
      if (!dbItemsById[iid]) throw new Error(`Item id ${iid} not found`);
      const dbit = dbItemsById[iid];
      // interpret is_production both as boolean or numeric
      if (dbit.is_production === 1 || dbit.is_production === true) {
        throw new Error(`Item id ${iid} (${dbit.name}) is production item; only non-production can be requested`);
      }
      const qty = Number(it.requested_qty);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error(`requested_qty must be > 0 for item ${iid}`);
    }

    // Create request and items in a transaction
    const t = await sequelize.transaction();
    try {
      const code = await this.generateRequestCode();

      const req = await StoreRequest.create({
        store_id: storeId,
        request_code: code,
        status: "pending",
        note,
        created_by: createdBy
      }, { transaction: t });

      const rows = items.map(it => ({
        store_request_id: req.id,
        item_id: Number(it.item_id),
        requested_qty: Number(it.requested_qty),
        uom_id: it.uom_id ?? null,
        note: it.note ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      await StoreRequestItem.bulkCreate(rows, { transaction: t });

      await t.commit();

      // return full request with items
      return await this.getRequestById(req.id);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getRequestById(id) {
    return await StoreRequest.findOne({
      where: { id },
      include: [
        { model: StoreRequestItem, as: "items", include: [{ model: Item, as: "item" }, { model: models.Uom, as: "uom" }] },
        { model: Store, as: "store" }
      ]
    });
  },

  async listRequestsByStore(storeId, opts = {}) {
    const where = { store_id: storeId };
    if (opts.status) where.status = opts.status;
    return await StoreRequest.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [{ model: StoreRequestItem, as: "items", include: [{ model: Item, as: "item" }] }]
    });
  },

  async listAllRequests(opts = {}) {
    const where = {};
    if (opts.status) where.status = opts.status;
    return await StoreRequest.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [{ model: StoreRequestItem, as: "items", include: [{ model: Item, as: "item" }] }, { model: Store, as: "store" }]
    });
  },

  // update status (approve/reject/fulfilled)
  async updateStatus(requestId, newStatus, processedBy = null) {
    const allowed = ["pending","approved","rejected","fulfilled"];
    if (!allowed.includes(newStatus)) throw new Error("Invalid status");
    const req = await StoreRequest.findByPk(requestId);
    if (!req) return null;
    req.status = newStatus;
    if (processedBy) req.processed_by = processedBy;
    await req.save();
    return await this.getRequestById(req.id);
  }
};
