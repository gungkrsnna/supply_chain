// services/storeRequestService.js
"use strict";

const { v4: uuidv4 } = require("uuid");
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
    const itemIds = [...new Set(items.map(i => Number(i.item_id)).filter(Boolean))];
    if (itemIds.length === 0) throw new Error("No valid item_id provided in items");

    const dbItems = await Item.findAll({ where: { id: itemIds } });
    const dbItemsById = {};
    dbItems.forEach(it => { dbItemsById[it.id] = it; });

    for (const it of items) {
      const iid = Number(it.item_id);
      if (!dbItemsById[iid]) throw new Error(`Item id ${iid} not found`);
      const dbit = dbItemsById[iid];
      if (dbit.is_production === 1 || dbit.is_production === true) {
        throw new Error(`Item id ${iid} (${dbit.name}) is production item; only non-production can be requested`);
      }
      const qty = Number(it.requested_qty);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error(`requested_qty must be > 0 for item ${iid}`);
    }

    const t = await sequelize.transaction();
    try {
      const code = await this.generateRequestCode();

      // Inspect model id attribute to see if DB/Model expects autoIncrement
      const idAttr = StoreRequest.rawAttributes && StoreRequest.rawAttributes.id;
      const idIsAuto = !!(idAttr && idAttr.autoIncrement);

      // Build payload for StoreRequest; if model not auto -> generate uuid
      const payload = {
        store_id: storeId,
        request_code: code,
        status: "pending",
        note,
        created_by: createdBy
      };

      if (!idIsAuto) {
        payload.id = uuidv4();
      }

      // Debug logs (remove in production)
      console.log("DEBUG StoreRequest.rawAttributes.id =", idAttr);
      console.log("DEBUG createStoreRequest payload =", payload);

      const req = await StoreRequest.create(payload, { transaction: t });

      // Prepare child rows using req.id (works for numeric or uuid)
      const rows = items.map(it => ({
        id: uuidv4(),
        store_request_id: req.id,
        item_id: Number(it.item_id),
        requested_qty: Number(it.requested_qty),
        uom_id: it.uom_id ?? null,
        note: it.note ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      console.log("DEBUG bulkCreate rows:", JSON.stringify(rows, null, 2));

      await StoreRequestItem.bulkCreate(rows, { transaction: t });

      await t.commit();

      return await this.getRequestById(req.id);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

    // add this inside the exported object (module.exports)
  async getRequestByUuid(uuid) {
  if (!uuid) return null;
  return await StoreRequest.findOne({
    where: { id: uuid },
    include: [
      {
        model: StoreRequestItem,
        as: "items",
        include: [
          {
            model: Item,
            as: "item",
            include: [
              { model: models.Uom, as: "uom", required: false }
            ]
          },
          { model: models.Uom, as: "uom", required: false }
        ]
      },
      { model: Store, as: "store" }
    ]
  });
},


  async updateStatusByUuid(uuid, newStatus, processedBy = null) {
    const allowed = ["pending","approved","rejected","fulfilled"];
    if (!allowed.includes(newStatus)) throw new Error("Invalid status");
    const reqRow = await StoreRequest.findOne({ where: { id: uuid } });
    if (!reqRow) return null;
    reqRow.status = newStatus;
    if (processedBy) reqRow.processed_by = processedBy;
    await reqRow.save();
    return await this.getRequestById(reqRow.id);
  },


 async getRequestById(id) {
  return await StoreRequest.findOne({
    where: { id },
    include: [
      {
        model: StoreRequestItem,
        as: "items",
        include: [
          // include Item and inside it its Uom (if Item -> Uom association exists)
          {
            model: Item,
            as: "item",
            include: [
              { model: models.Uom, as: "uom", required: false } // item.uom
            ]
          },
          // also include Uom directly from store_request_items.uom_id if present
          { model: models.Uom, as: "uom", required: false } // item.uom (fallback)
        ]
      },
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
    include: [
      {
        model: StoreRequestItem,
        as: "items",
        include: [
          {
            model: Item,
            as: "item",
            include: [{ model: models.Uom, as: "uom", required: false }]
          },
          { model: models.Uom, as: "uom", required: false }
        ]
      }
    ]
  });
},


  async listAllRequests(opts = {}) {
  const where = {};
  if (opts.status) where.status = opts.status;
  return await StoreRequest.findAll({
    where,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: StoreRequestItem,
        as: "items",
        include: [
          {
            model: Item,
            as: "item",
            include: [{ model: models.Uom, as: "uom", required: false }]
          },
          { model: models.Uom, as: "uom", required: false }
        ]
      },
      { model: Store, as: "store" }
    ]
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
  },

  // bulk approve: set status -> 'approved' and set processed_by
  async bulkApprove(requestIds = [], processedBy = null) {
    if (!Array.isArray(requestIds) || requestIds.length === 0) return 0;
    const t = await sequelize.transaction();
    try {
      const [updatedCount] = await StoreRequest.update(
        { status: 'approved', processed_by: processedBy },
        { where: { id: { [Op.in]: requestIds } }, transaction: t }
      );
      await t.commit();
      return updatedCount;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // services/storeRequestService.js (inside module.exports)
  async listRequestsByBrand(brandId, opts = {}) {
    const limit = Math.min(opts.limit || 100, 1000);
    const page = Math.max(opts.page || 1, 1);
    const offset = (page - 1) * limit;

    // optional search q: search on request_code or store.name
    const { Op } = require("sequelize");
    const whereReq = {};
    if (opts.status) whereReq.status = opts.status;

    // join via Store -> Brand relationship: find requests whose store.brand_id = brandId
    const rows = await StoreRequest.findAll({
      where: whereReq,
      include: [
        {
          model: require("../models").Store,
          as: "store",
          where: { brand_id: brandId },
          attributes: ["id", "name", "address", "brand_id"],
          required: true
        },
        {
          model: StoreRequestItem,
          as: "items",
          include: [
            { model: require("../models").Item, as: "item", include: [{ model: require("../models").Uom, as: "uom", required: false }] },
            { model: require("../models").Uom, as: "uom", required: false }
          ]
        }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    return rows;
  },


  // Return detailed data needed for delivery PDF: requests + items + item.uom
  async getRequestsForDelivery(requestIds = []) {
    if (!Array.isArray(requestIds) || requestIds.length === 0) return [];
    const rows = await StoreRequest.findAll({
      where: { id: { [Op.in]: requestIds } },
      order: [['createdAt','ASC']],
      include: [
        {
          model: StoreRequestItem,
          as: 'items',
          include: [
            { model: models.Item, as: 'item', include: [{ model: models.Uom, as: 'uom', required: false }] },
            { model: models.Uom, as: 'uom', required: false }
          ]
        },
        { model: models.Store, as: 'store' }
      ]
    });
    return rows;
  },

  // generate PDF and stream to res (deliveryData from getRequestsForDelivery)
  generateDeliveryPdfStream(deliveryData = [], meta = {}, res) {
    // deliveryData: array of StoreRequest instances (with included items)
    // meta: { driverName, vehicleNo }

    const doc = new PDFDocument({ margin: 36, size: 'A4' });

    // set response headers for download
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `surat_jalan_${Date.now()}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // pipe PDF to response
    doc.pipe(res);

    // Header
    doc.fontSize(14).text('SURAT JALAN / DELIVERY NOTE', { align: 'center' });
    doc.moveDown(0.5);

    // meta info
    doc.fontSize(10);
    doc.text(`Tanggal: ${new Date().toLocaleString()}`);
    if (meta.driverName) doc.text(`Driver: ${meta.driverName}`);
    if (meta.vehicleNo) doc.text(`No Kendaraan: ${meta.vehicleNo}`);
    doc.moveDown(0.5);

    // For each request, print its info and items
    deliveryData.forEach((req, idx) => {
      doc.fontSize(11).text(`${idx + 1}. Request: ${req.request_code}  (Store: ${req.store?.name ?? req.store_id})`);
      doc.fontSize(10).text(`Status: ${req.status}  |  Tgl: ${req.createdAt ? new Date(req.createdAt).toLocaleString() : '-'}`);
      doc.moveDown(0.2);

      // table header
      doc.font('Helvetica-Bold');
      doc.text('No', { continued: true, width: 30 });
      doc.text('Nama Item', { continued: true, width: 250 });
      doc.text('Qty', { continued: true, width: 60, align: 'right' });
      doc.text('UOM', { align: 'right' });
      doc.font('Helvetica');
      doc.moveDown(0.2);

      // items
      req.items.forEach((it, i) => {
        const itemName = it.item?.name ?? `Item ${it.item_id}`;
        const uomName = it.item?.uom?.name ?? it.uom?.name ?? '-';
        doc.text(String(i + 1), { continued: true, width: 30 });
        doc.text(itemName, { continued: true, width: 250 });
        doc.text(Number(it.requested_qty).toLocaleString(), { continued: true, width: 60, align: 'right' });
        doc.text(uomName, { align: 'right' });
      });

      doc.moveDown(0.8);
      // draw a line
      doc.moveTo(doc.x, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.6);
    });

    // signature block
    doc.moveDown(1);
    const sigY = doc.y;
    doc.text('Dibuat oleh,', { continued: true, width: 200 });
    doc.text('Diterima oleh,', { align: 'right' });
    doc.moveDown(3);
    doc.text('(________________)', { continued: true, width: 200 });
    doc.text('(________________)', { align: 'right' });

    doc.end(); // finalize and send
    // Note: no need to return res because we piped doc to res
  }
};

