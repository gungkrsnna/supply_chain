// src/services/kitchenWorkflowService.js
const models = require('../models');
const productionOrderService = require('./productionOrderService');
const sequelize = models.sequelize;
const { Sequelize } = require('sequelize');

/* --- config (isi sesuai produkmu) --- */
const itemConfig = {
  4: { item_name: "Almond Butter", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Milk Butter", fillingPerUnitGram: 30 },
  7: { item_name: "Choco", doughType: "Choco Dough", doughWeightPerUnit: 200, fillingType: "Choco Filling", fillingPerUnitGram: 25 },
};
const fillingConfig = {
  "Milk Butter": { takaranPerLoyang: 5855 },
  "Choco Filling": { takaranPerLoyang: 4000 },
};


const loyangCapacities = [430, 215, 107];

function breakdownLoyang(totalGram, capacities = loyangCapacities) {
  let remaining = Math.max(0, Math.round(totalGram));
  const byCapacity = [];
  let totalCount = 0;
  for (const c of capacities) {
    const count = Math.floor(remaining / c);
    byCapacity.push({ capacity: c, count });
    totalCount += count;
    remaining -= count * c;
  }
  return { byCapacity, remainder: remaining, totalCount };
}

async function createRunFromDate(date, createdBy = null) {
  const totals = await productionOrderService.aggregateTotalsByItem(date); // returns [{item_id, item_name, total_quantity}]
  console.log('createRunFromDate: totals length =', Array.isArray(totals) ? totals.length : 'not-array', totals && totals.slice ? totals.slice(0,5) : totals);

  return sequelize.transaction(async (t) => {
    const RunModel = models.KitchenRun;
    const ItemModel = models.KitchenRunItem;
    const DoughModel = models.KitchenDough;
    const FillingModel = models.KitchenFilling;

    const run = RunModel
      ? await RunModel.create({ date, status: 'pending', created_by: createdBy }, { transaction: t })
      : null;

    let runId = run ? run.id : null;
    // if no model, fallback to raw insert
    if (!runId) {
      await sequelize.query("INSERT INTO kitchen_runs (date, status, created_by) VALUES (?, 'pending', ?)", { replacements: [date, createdBy], transaction: t });
      const last = (await sequelize.query("SELECT LAST_INSERT_ID() as id", { transaction: t, type: Sequelize.QueryTypes.SELECT }))[0];
      runId = last.id;
    }

    // aggregates
    const doughAgg = {};
    const fillingAgg = {};

    // safety: if totals is not array or empty -> still create run, but log and return
    if (!Array.isArray(totals) || totals.length === 0) {
      console.warn('createRunFromDate: no totals returned for date', date);
      return { kitchen_run_id: runId, created_items: 0 };
    }

    let createdItemsCount = 0;

    // insert items
    for (const row of totals) {
      const itemId = Number(row.item_id);
      const cfg = itemConfig[itemId] || { doughType: null, doughWeightPerUnit: 0, fillingType: null, fillingPerUnitGram: 0 };
      const target = Number(row.total_quantity || 0);
      const leftover = 0;
      const adjustment = 0;
      const totalJumlahProduksi = target - leftover + adjustment;

      // accumulate
      const neededDoughWeight = totalJumlahProduksi * (cfg.doughWeightPerUnit || 0);
      if (cfg.doughType) doughAgg[cfg.doughType] = (doughAgg[cfg.doughType] || 0) + neededDoughWeight;

      if (cfg.fillingType) {
        const g = totalJumlahProduksi * (cfg.fillingPerUnitGram || 0);
        fillingAgg[cfg.fillingType] = (fillingAgg[cfg.fillingType] || 0) + g;
      }

      if (ItemModel) {
        await ItemModel.create({
          kitchen_run_id: runId,
          item_id: itemId,
          item_name: row.item_name || cfg.item_name || null,
          target_production: target,
          leftover_previous: leftover,
          adjustment,
          total_jumlah_produksi: totalJumlahProduksi,
          dough_type: cfg.doughType,
          dough_weight_per_unit: cfg.doughWeightPerUnit || 0,
          filling_type: cfg.fillingType,
          filling_per_unit_gram: cfg.fillingPerUnitGram || 0,
        }, { transaction: t });
      } else {
        await sequelize.query(
          `INSERT INTO kitchen_run_items
            (kitchen_run_id, item_id, item_name, target_production, leftover_previous, adjustment, total_jumlah_produksi, dough_type, dough_weight_per_unit, filling_type, filling_per_unit_gram)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          { replacements: [runId, itemId, row.item_name || cfg.item_name || null, target, leftover, adjustment, totalJumlahProduksi, cfg.doughType, cfg.doughWeightPerUnit || 0, cfg.fillingType, cfg.fillingPerUnitGram || 0], transaction: t }
        );
      }
      createdItemsCount++;
    }

    // insert dough aggregates
    for (const [doughType, totalWeight] of Object.entries(doughAgg)) {
      const breakdown = breakdownLoyang(totalWeight, loyangCapacities);
      if (DoughModel) {
        await DoughModel.create({ kitchen_run_id: runId, dough_type: doughType, total_weight: Math.round(totalWeight), total_loyang: breakdown.totalCount, remainder: breakdown.remainder }, { transaction: t });
      } else {
        await sequelize.query(`INSERT INTO kitchen_dough (kitchen_run_id, dough_type, total_weight, total_loyang, remainder) VALUES (?, ?, ?, ?, ?)`, { replacements: [runId, doughType, Math.round(totalWeight), breakdown.totalCount, breakdown.remainder], transaction: t });
      }
    }

    // insert filling aggregates
    for (const [fillingType, totalGram] of Object.entries(fillingAgg)) {
      const cfg = fillingConfig[fillingType] || { takaranPerLoyang: 0 };
      const takaran = cfg.takaranPerLoyang || 0;
      const loyangNeeded = takaran > 0 ? Math.floor(totalGram / takaran) : 0;
      const remainder = takaran > 0 ? Math.round(totalGram - loyangNeeded * takaran) : Math.round(totalGram);

      if (FillingModel) {
        await FillingModel.create({ kitchen_run_id: runId, filling_type: fillingType, total_gram: Math.round(totalGram), takaran_per_loyang: takaran, loyang_needed: loyangNeeded, remainder_gram: remainder }, { transaction: t });
      } else {
        await sequelize.query(`INSERT INTO kitchen_filling (kitchen_run_id, filling_type, total_gram, takaran_per_loyang, loyang_needed, remainder_gram) VALUES (?, ?, ?, ?, ?, ?)`, { replacements: [runId, fillingType, Math.round(totalGram), takaran, loyangNeeded, remainder], transaction: t });
      }
    }

    return { kitchen_run_id: runId, created_items: createdItemsCount };
  });
}


// --- replace existing getRun with this simple raw-select version ---
async function getRun(idOrDate) {
  // DEBUG: show loaded model keys (helps diagnose association issues)
  try {
    if (models && typeof models === "object") {
      console.log("getRun: models loaded:", Object.keys(models));
    }
    if (models.KitchenRun && models.KitchenRun.associations) {
      console.log("getRun: KitchenRun.associations keys:", Object.keys(models.KitchenRun.associations));
    }
  } catch (e) {
    console.warn("getRun: debug log failed:", e && e.message ? e.message : e);
  }

  // resolve date -> id if needed
  let runId = idOrDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(idOrDate))) {
    const rows = await sequelize.query("SELECT * FROM kitchen_runs WHERE date = ? LIMIT 1", {
      replacements: [idOrDate],
      type: Sequelize.QueryTypes.SELECT,
    });
    if (!rows || rows.length === 0) return null;
    runId = rows[0].id;
  }

  // raw selects (robust fallback)
  const runRows = await sequelize.query("SELECT * FROM kitchen_runs WHERE id = ?", {
    replacements: [runId],
    type: Sequelize.QueryTypes.SELECT,
  });
  const run = runRows && runRows.length ? runRows[0] : null;
  if (!run) return null;

  const items = await sequelize.query("SELECT * FROM kitchen_run_items WHERE kitchen_run_id = ?", {
    replacements: [runId],
    type: Sequelize.QueryTypes.SELECT,
  });

  const dough = await sequelize.query("SELECT * FROM kitchen_dough WHERE kitchen_run_id = ?", {
    replacements: [runId],
    type: Sequelize.QueryTypes.SELECT,
  });

  const filling = await sequelize.query("SELECT * FROM kitchen_filling WHERE kitchen_run_id = ?", {
    replacements: [runId],
    type: Sequelize.QueryTypes.SELECT,
  });

  const qc = await sequelize.query("SELECT * FROM kitchen_qc WHERE kitchen_run_id = ?", {
    replacements: [runId],
    type: Sequelize.QueryTypes.SELECT,
  });

  return { run, items, dough, filling, qc };
}


async function markStageComplete(runId, stage) {
  const allowed = { dough: 'dough_done', filling: 'filling_done', merged: 'merged' };
  if (!allowed[stage]) throw new Error('invalid stage');
  const newStatus = allowed[stage];
  await sequelize.query("UPDATE kitchen_runs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", { replacements: [newStatus, runId] });
  return true;
}

async function addQC(runId, stage, status, note = null, checked_by = null) {
  await sequelize.query("INSERT INTO kitchen_qc (kitchen_run_id, stage, status, note, checked_by) VALUES (?, ?, ?, ?, ?)", { replacements: [runId, stage, status, note, checked_by] });
  if (status === 'pass') {
    await sequelize.query("UPDATE kitchen_runs SET status = ? WHERE id = ?", { replacements: ['qc_passed', runId] });
  } else {
    await sequelize.query("UPDATE kitchen_runs SET status = ? WHERE id = ?", { replacements: ['qc_failed', runId] });
  }
  return true;
}

module.exports = {
  createRunFromDate,
  getRun,
  markStageComplete,
  addQC,
  itemConfig,
  fillingConfig,
  loyangCapacities,
};




// // src/services/kitchenWorkflowService.js
// const models = require("../models");
// const productionOrderService = require("./productionOrderService");
// const sequelize = models.sequelize;
// const { Sequelize } = require("sequelize");

// // Simple config — sesuaikan dengan produkmu
// const itemConfig = {
//   // contoh: item_id: {...}
//   4: { item_name: "Almond Butter", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Milk Butter", fillingPerUnitGram: 30 },
//   5: { item_name: "Lotus Biscoff", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Milk Butter", fillingPerUnitGram: 30 },
//   // ... tambah semua item id yg relevan
// };

// // filling takaran per loyang (gram)
// const fillingConfig = {
//   "Milk Butter": { takaranPerLoyang: 5855 },
//   "Chocolate Butter": { takaranPerLoyang: 830 },
//   "Cinnamon Butter": { takaranPerLoyang: 650 },
//   "Black Butter": { takaranPerLoyang: 760 },
// };

// // loyang capacities (gram) — ubah jika kapasitas di Excel berbeda (mis. 650 g)
// const loyangCapacities = [430, 215, 107];

// /* helper */
// function breakdownLoyang(totalGram, capacities = loyangCapacities) {
//   const result = [];
//   let remaining = Math.max(0, Math.round(totalGram));
//   let totalCount = 0;
//   for (const c of capacities) {
//     const count = Math.floor(remaining / c);
//     result.push({ capacity: c, count });
//     totalCount += count;
//     remaining -= count * c;
//   }
//   return { byCapacity: result, remainder: remaining, totalCount };
// }

// /* create a run based on date */
// async function createRunFromDate(date, createdBy = null) {
//   // 1) get totals per item from productionOrderService
//   const totals = await productionOrderService.aggregateTotalsByItem(date);

//   // 2) create transaction
//   return sequelize.transaction(async (t) => {
//     const RunModel = models.KitchenRun || models.kitchen_runs || null;
//     // if you don't have model, use raw query insert
//     let run;
//     if (RunModel) {
//       run = await RunModel.create({ date, status: "pending", created_by: createdBy }, { transaction: t });
//     } else {
//       const r = await sequelize.query(
//         "INSERT INTO kitchen_runs (date, status, created_by) VALUES (?, 'pending', ?); SELECT LAST_INSERT_ID() as id;",
//         { replacements: [date, createdBy], transaction: t, type: Sequelize.QueryTypes.INSERT }
//       );
//       // fallback: get id via separate query
//       const [[{ id }]] = await sequelize.query("SELECT LAST_INSERT_ID() as id", { transaction: t, type: Sequelize.QueryTypes.SELECT });
//       run = { id };
//     }

//     const runId = run.id || run;

//     // containers
//     const doughAgg = {}; // doughType => totalWeight
//     const fillingAgg = {}; // fillingType => totalGram

//     // insert items
//     for (const row of totals) {
//       const itemId = Number(row.item_id);
//       const cfg = itemConfig[itemId] || { doughType: null, doughWeightPerUnit: 0, fillingType: null, fillingPerUnitGram: 0 };
//       const target = Number(row.total_quantity || 0);
//       const leftover = 0;
//       const adjustment = 0;
//       const totalJumlahProduksi = target - leftover + adjustment;

//       // calc
//       const neededDoughWeight = totalJumlahProduksi * Number(cfg.doughWeightPerUnit || 0);
//       if (cfg.doughType) doughAgg[cfg.doughType] = (doughAgg[cfg.doughType] || 0) + neededDoughWeight;

//       if (cfg.fillingType) {
//         const g = totalJumlahProduksi * Number(cfg.fillingPerUnitGram || 0);
//         fillingAgg[cfg.fillingType] = (fillingAgg[cfg.fillingType] || 0) + g;
//       }

//       // save kitchen_run_items
//       await sequelize.query(
//         `INSERT INTO kitchen_run_items
//         (kitchen_run_id, item_id, item_name, target_production, leftover_previous, adjustment, total_jumlah_produksi, dough_type, dough_weight_per_unit, filling_type, filling_per_unit_gram)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         {
//           replacements: [
//             runId,
//             itemId,
//             row.item_name || cfg.item_name || null,
//             target,
//             leftover,
//             adjustment,
//             totalJumlahProduksi,
//             cfg.doughType,
//             cfg.doughWeightPerUnit || 0,
//             cfg.fillingType,
//             cfg.fillingPerUnitGram || 0,
//           ],
//           transaction: t,
//         }
//       );
//     }

//     // insert dough aggregates
//     for (const [doughType, totalWeight] of Object.entries(doughAgg)) {
//       const breakdown = breakdownLoyang(totalWeight, loyangCapacities);
//       await sequelize.query(
//         `INSERT INTO kitchen_dough (kitchen_run_id, dough_type, total_weight, total_loyang, remainder)
//          VALUES (?, ?, ?, ?, ?)`,
//         { replacements: [runId, doughType, Math.round(totalWeight), breakdown.totalCount, breakdown.remainder], transaction: t }
//       );
//     }

//     // insert filling aggregates
//     for (const [fillingType, totalGram] of Object.entries(fillingAgg)) {
//       const cfg = fillingConfig[fillingType] || { takaranPerLoyang: 0 };
//       const takaran = cfg.takaranPerLoyang || 0;
//       const loyangNeeded = takaran > 0 ? Math.floor(totalGram / takaran) : 0;
//       const remainder = takaran > 0 ? Math.round(totalGram - loyangNeeded * takaran) : Math.round(totalGram);
//       await sequelize.query(
//         `INSERT INTO kitchen_filling (kitchen_run_id, filling_type, total_gram, takaran_per_loyang, loyang_needed, remainder_gram)
//          VALUES (?, ?, ?, ?, ?, ?)`,
//         { replacements: [runId, fillingType, Math.round(totalGram), takaran, loyangNeeded, remainder], transaction: t }
//       );
//     }

//     return { kitchen_run_id: runId };
//   });
// }

// /* get run with relasi (items, dough, filling, qc) */
// async function getRun(runIdOrDate) {
//   // if param is date string, fetch by date, else by id
//   const byDate = /^\d{4}-\d{2}-\d{2}$/.test(String(runIdOrDate));
//   if (byDate) {
//     const rows = await sequelize.query("SELECT * FROM kitchen_runs WHERE date = ? LIMIT 1", { replacements: [runIdOrDate], type: Sequelize.QueryTypes.SELECT });
//     if (!rows || rows.length === 0) return null;
//     runIdOrDate = rows[0].id;
//   }

//   const run = (await sequelize.query("SELECT * FROM kitchen_runs WHERE id = ?", { replacements: [runIdOrDate], type: Sequelize.QueryTypes.SELECT }))[0];
//   if (!run) return null;

//   const items = await sequelize.query("SELECT * FROM kitchen_run_items WHERE kitchen_run_id = ?", { replacements: [run.id], type: Sequelize.QueryTypes.SELECT });
//   const dough = await sequelize.query("SELECT * FROM kitchen_dough WHERE kitchen_run_id = ?", { replacements: [run.id], type: Sequelize.QueryTypes.SELECT });
//   const filling = await sequelize.query("SELECT * FROM kitchen_filling WHERE kitchen_run_id = ?", { replacements: [run.id], type: Sequelize.QueryTypes.SELECT });
//   const qc = await sequelize.query("SELECT * FROM kitchen_qc WHERE kitchen_run_id = ?", { replacements: [run.id], type: Sequelize.QueryTypes.SELECT });

//   return { run, items, dough, filling, qc };
// }

// /* mark stage complete */
// async function markStageComplete(runId, stage) {
//   const allowed = { dough: "dough_done", filling: "filling_done", merged: "merged" };
//   if (!allowed[stage]) throw new Error("invalid stage");
//   const newStatus = allowed[stage];
//   await sequelize.query("UPDATE kitchen_runs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", { replacements: [newStatus, runId] });
//   return true;
// }

// /* add QC record */
// async function addQC(runId, stage, status, note = null, checked_by = null) {
//   await sequelize.query(
//     `INSERT INTO kitchen_qc (kitchen_run_id, stage, status, note, checked_by) VALUES (?, ?, ?, ?, ?)`,
//     { replacements: [runId, stage, status, note, checked_by] }
//   );
//   // optionally update run status if pass/fail
//   if (status === "pass") {
//     await sequelize.query("UPDATE kitchen_runs SET status = ? WHERE id = ?", { replacements: ["qc_passed", runId] });
//   } else {
//     await sequelize.query("UPDATE kitchen_runs SET status = ? WHERE id = ?", { replacements: ["qc_failed", runId] });
//   }
//   return true;
// }

// module.exports = {
//   createRunFromDate,
//   getRun,
//   markStageComplete,
//   addQC,
//   // expose configs for runtime edit if needed
//   itemConfig,
//   fillingConfig,
//   loyangCapacities,
// };
