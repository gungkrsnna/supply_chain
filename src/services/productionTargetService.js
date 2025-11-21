// services/productionTargetService.js
const { ProductionTarget, ProductionTargetStore, ProductionTargetItem, Store, Inventory, Recipe, RecipeComponent, Item, sequelize } = require('../models');

async function createBulkProductionTarget({ brand_id, target_date, created_by, fg_defaults = [], overrides = {}, notes }) {
  // jalankan dalam transaction
  return sequelize.transaction(async (t) => {
    const pt = await ProductionTarget.create({ id: require('uuid').v4(), brand_id, target_date, created_by, notes }, { transaction: t });

    // ambil semua stores brand
    const stores = await Store.findAll({ where: { brandId: brand_id }, transaction: t });

    const results = [];

    for (const store of stores) {
      // create ProductionTargetStore
      const storeTarget = await ProductionTargetStore.create({ production_target_id: pt.id, store_id: store.id }, { transaction: t });

      // untuk setiap FG default
      for (const fg of fg_defaults) {
        const fgItemId = fg.fg_item_id;
        // per-store override?
        const storeKey = `store_${store.id}`;
        let targetPerStore = fg.default_target_per_store;
        if (overrides && overrides[storeKey]) {
          const ov = overrides[storeKey].find(x => x.fg_item_id === fgItemId);
          if (ov && ov.target != null) targetPerStore = ov.target;
        }

        // ambil current FG inventory di store (asumsi Inventory.qty = unit count of FG)
        const invFG = await Inventory.findOne({ where: { store_id: store.id, item_id: fgItemId }, transaction: t });
        const invQtyFG = invFG ? parseFloat(invFG.qty) : 0;

        // kebutuhan unit yang harus diproduksi
        const neededUnits = Math.max(0, parseFloat(targetPerStore) - invQtyFG);

        // ambil recipe aktif untuk FG
        const recipe = await Recipe.findOne({
          where: { item_id: fgItemId, is_active: true },
          include: [{ model: RecipeComponent, as: 'components', include: [{ model: Item, as: 'componentItem' }] }],
          transaction: t
        });

        // fallback: jika tidak ada recipe, simpan planned_qty saja
        let plannedGramPerUnit = null;
        if (!recipe) {
          await ProductionTargetItem.create({
            production_target_store_id: storeTarget.id,
            fg_item_id: fgItemId,
            planned_qty: neededUnits,
          }, { transaction: t });
        } else {
          // hitung komponen total yg dibutuhkan (kita bisa simpan komponen kebutuhan di separate table jika perlu)
          const comps = recipe.components.map(c => ({
            component_item_id: c.component_item_id,
            per_recipe_qty: parseFloat(c.qty) // qty untuk yield_qty
          }));

          // jika recipe.yield_qty != 1, sesuaikan
          const yieldQty = parseFloat(recipe.yield_qty || 1);

          // hitung total comp needed per component
          const compTotals = {};
          for (const c of comps) {
            const totalNeeded = (neededUnits * c.per_recipe_qty) / yieldQty;
            compTotals[c.component_item_id] = (compTotals[c.component_item_id] || 0) + totalNeeded;
          }

          // cek inventory komponen di store dan catat shortage (opsional)
          const shortages = [];
          for (const compItemId of Object.keys(compTotals)) {
            const invComp = await Inventory.findOne({ where: { store_id: store.id, item_id: compItemId }, transaction: t });
            const invQtyComp = invComp ? parseFloat(invComp.qty) : 0;
            if (invQtyComp < compTotals[compItemId]) {
              shortages.push({ component_item_id: parseInt(compItemId), needed: compTotals[compItemId], stock: invQtyComp });
            }
          }

          // jika ingin auto-reduce production sampai komponen cukup, implement logic di sini.
          // Simpan ProductionTargetItem
          await ProductionTargetItem.create({
            production_target_store_id: storeTarget.id,
            fg_item_id: fgItemId,
            planned_qty: neededUnits,
            planned_gram_per_unit: plannedGramPerUnit
          }, { transaction: t });

          // bisa juga simpan shortage info ke logs atau response
          if (shortages.length) {
            results.push({ store_id: store.id, fg_item_id: fgItemId, neededUnits, shortages });
          }
        }
      }
    }

    return { productionTargetId: pt.id, warnings: results };
  });
}

module.exports = { createBulkProductionTarget };
