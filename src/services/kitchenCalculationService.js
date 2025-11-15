// src/services/kitchenCalculationService.js
const productionOrderService = require("./productionOrderService");
const models = require("../models"); // agar bisa ambil leftover/adjusment jika ada

/**
 * CONFIGURABLE SECTION
 * Sesuaikan mapping berikut dengan data dari spreadsheet mu:
 *
 * - itemConfig[item_id] = {
 *     item_name,
 *     doughType,            // nama kelompok dough (Plain Dough, Chocolate Dough, etc)
 *     doughWeightPerUnit,   // gram atau unit berat per produk (untuk konversi loyang)
 *     fillingType,          // filling name (Milk Butter, Chocolate Butter, etc) or null
 *     fillingPerUnitGram    // gram filling per produk (atau per loyang if prefer)
 *   }
 *
 * - fillingConfig[fillingType] = {
 *     takaranPerLoyang // gram per loyang (dari spreadsheet)
 *   }
 *
 * - loyangCapacities = [430, 215, 107] // contoh, ubah sesuai sheet
 */
const itemConfig = {
  4: { item_name: "Almond Butter", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Milk Butter", fillingPerUnitGram: 30 },
  5: { item_name: "Lotus Biscoff", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Milk Butter", fillingPerUnitGram: 30 },
  6: { item_name: "Double Cheese", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Chocolate Butter", fillingPerUnitGram: 25 },
  7: { item_name: "Snow Cheese", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Milk Butter", fillingPerUnitGram: 28 },
  9: { item_name: "Cinnamon Roll", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Cinnamon Butter", fillingPerUnitGram: 20 },
  10: { item_name: "Cookies and Cream", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Chocolate Butter", fillingPerUnitGram: 22 },
  12: { item_name: "Dirty Triple Choco", doughType: "Chocolate Dough", doughWeightPerUnit: 215, fillingType: "Chocolate Butter", fillingPerUnitGram: 69 },
  13: { item_name: "Red Velvet Hazelnut Chocolate", doughType: "Red Velvet Dough", doughWeightPerUnit: 215, fillingType: "Chocolate Butter", fillingPerUnitGram: 69 },
  14: { item_name: "Red Velvet Cream Cheese", doughType: "Red Velvet Dough", doughWeightPerUnit: 215, fillingType: "Cream Cheese", fillingPerUnitGram: 35 },
  15: { item_name: "Cream Cheese Raisin", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Cream Cheese", fillingPerUnitGram: 35 },
  16: { item_name: "Japanese Dirty Matcha", doughType: "Matcha Dough", doughWeightPerUnit: 215, fillingType: "Matcha Cream", fillingPerUnitGram: 30 },
  18: { item_name: "Abon Spicy", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Abon Pedas", fillingPerUnitGram: 30 },
  19: { item_name: "Original Hotdog Roll", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Hotdog", fillingPerUnitGram: 50 },
  20: { item_name: "BBQ Hotdog Roll", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "BBQ Sauce", fillingPerUnitGram: 50 },
  21: { item_name: "Pizza Roll", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Pizza Sauce", fillingPerUnitGram: 40 },
  22: { item_name: "Corn Chicken Ham", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Corn Ham", fillingPerUnitGram: 45 },
  23: { item_name: "Ham and Cheese Brulee Bomb", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Cheese Brulee", fillingPerUnitGram: 45 },
  24: { item_name: "Garlic Mayo Chicken Ham", doughType: "Plain Dough", doughWeightPerUnit: 215, fillingType: "Garlic Mayo", fillingPerUnitGram: 40 },
};

const fillingConfig = {
  "Milk Butter": { takaranPerLoyang: 5855 },
  "Chocolate Butter": { takaranPerLoyang: 830 },
  "Cinnamon Butter": { takaranPerLoyang: 650 },
  "Cream Cheese": { takaranPerLoyang: 800 },
  "BBQ Sauce": { takaranPerLoyang: 920 },
  "Pizza Sauce": { takaranPerLoyang: 880 },
  "Corn Ham": { takaranPerLoyang: 750 },
  "Cheese Brulee": { takaranPerLoyang: 890 },
  "Garlic Mayo": { takaranPerLoyang: 770 },
  "Hotdog": { takaranPerLoyang: 700 },
  "Abon Pedas": { takaranPerLoyang: 850 },
  "Matcha Cream": { takaranPerLoyang: 900 },
};

const loyangCapacities = [430, 215, 107];

/**
 * helper: bagi total dough menjadi loyang sesuai kapasitas (greedy)
 * returns object { byCapacity: [{capacity, count}], remainder }
 */
function breakdownLoyang(totalUnits, capacities = loyangCapacities) {
  // totalUnits diasumsikan sudah dalam satuan "unit loyang" (mis: jumlah loyang setara)
  // namun di implementasi kita, totalUnits adalah jumlah "weight" yg sama unit dengan kapasitas.
  const result = [];
  let remaining = Math.max(0, Math.round(totalUnits));

  for (const c of capacities) {
    const count = Math.floor(remaining / c);
    result.push({ capacity: c, count });
    remaining = remaining - count * c;
  }
  return { byCapacity: result, remainder: remaining };
}

/**
 * Main function: calculateKitchenProduction(date)
 * - date: string 'YYYY-MM-DD'
 */
async function calculateKitchenProduction(date) {
  // 1) ambil totals per item (service yang sudah ada)
  // gunakan productionOrderService.aggregateTotalsByItem jika ada
  let totals;
  if (typeof productionOrderService.aggregateTotalsByItem === "function") {
    totals = await productionOrderService.aggregateTotalsByItem(date);
    // totals: [{ item_id, item_name, total_quantity }]
  } else {
    // fallback: panggil findByStoreAndDate dan agregasi manual
    const rows = await productionOrderService.findByStoreAndDate(null, date);
    const map = {};
    for (const r of rows) {
      map[r.item_id] = (map[r.item_id] || 0) + (r.quantity || 0);
    }
    totals = Object.keys(map).map((id) => ({ item_id: Number(id), item_name: null, total_quantity: map[id] }));
  }

  // 2) ambil leftover & adjustment jika model tersedia (fallback 0)
  // Asumsi model Leftover dan Adjustment optional — jika tidak ada, pakai 0
  const Leftover = models.Leftover || null;
  const Adjustment = models.Adjustment || null;

  // create result containers
  const breakdownProduction = []; // per item
  const doughAgg = {}; // doughType => totalWeight
  const fillingAgg = {}; // fillingType => totalGram

  for (const row of totals) {
    const itemId = Number(row.item_id);
    const itemName = row.item_name || (itemConfig[itemId] ? itemConfig[itemId].item_name : null);
    const totalProduction = Number(row.total_quantity || 0);

    // leftover from D-1
    let leftover = 0;
    if (Leftover) {
      const lf = await Leftover.findOne({ where: { item_id: itemId, date } }); // model shape must match
      leftover = lf ? Number(lf.quantity || 0) : 0;
    }

    // adjustment (manual)
    let adjustment = 0;
    if (Adjustment) {
      const ad = await Adjustment.findOne({ where: { item_id: itemId, date } });
      adjustment = ad ? Number(ad.quantity || 0) : 0;
    }

    const totalJumlahProduksi = totalProduction - leftover + adjustment;

    // compute dough & filling using config
    const cfg = itemConfig[itemId] || { doughType: null, doughWeightPerUnit: 0, fillingType: null, fillingPerUnitGram: 0 };

    const doughWeightPerUnit = Number(cfg.doughWeightPerUnit || 0); // gram per produk (atau unit yang sama dengan loyang capacity)
    const neededDoughWeight = totalJumlahProduksi * doughWeightPerUnit;

    if (cfg.doughType) {
      doughAgg[cfg.doughType] = (doughAgg[cfg.doughType] || 0) + neededDoughWeight;
    }

    if (cfg.fillingType) {
      const fillingGramPerUnit = Number(cfg.fillingPerUnitGram || 0);
      const neededFillingGram = totalJumlahProduksi * fillingGramPerUnit;
      fillingAgg[cfg.fillingType] = (fillingAgg[cfg.fillingType] || 0) + neededFillingGram;
    }

    breakdownProduction.push({
      item_id: itemId,
      item_name: itemName,
      target_production: totalProduction,
      leftover_previous: leftover,
      adjustment,
      total_jumlah_produksi: totalJumlahProduksi,
      dough: {
        doughType: cfg.doughType,
        doughWeightPerUnit,
        neededDoughWeight,
      },
      filling: {
        fillingType: cfg.fillingType,
        fillingPerUnitGram: cfg.fillingPerUnitGram || 0,
      },
    });
  }

  // 3) convert doughAgg -> loyang breakdown (pakai capacities)
  const doughCalc = [];
  for (const [doughType, totalWeight] of Object.entries(doughAgg)) {
    // jika loyang capacities dinyatakan dalam "jumlah produk per loyang" atau "gram per loyang"
    // di sini kita asumsikan capacities juga dalam gram (sesuaikan jika berbeda)
    const breakdown = breakdownLoyang(totalWeight, loyangCapacities);
    doughCalc.push({
      dough_type: doughType,
      total_weight: Math.round(totalWeight),
      loyang: breakdown.byCapacity, // array {capacity, count}
      remainder: breakdown.remainder,
    });
  }

  // 4) filling calculation: convert to takaran per loyang (if fillingConfig tersedia)
  const fillingCalc = [];
  for (const [fillingType, totalGram] of Object.entries(fillingAgg)) {
    const cfg = fillingConfig[fillingType];
    const takaranPerLoyang = cfg ? Number(cfg.takaranPerLoyang || 0) : null;
    let neededLoyang = null;
    let final = Math.round(totalGram);
    if (takaranPerLoyang && takaranPerLoyang > 0) {
      neededLoyang = Math.floor(totalGram / takaranPerLoyang);
      // remainder grams
      const remainder = totalGram - neededLoyang * takaranPerLoyang;
      fillingCalc.push({
        filling_type: fillingType,
        total_gram: Math.round(totalGram),
        takaran_per_loyang: takaranPerLoyang,
        loyang_needed: neededLoyang,
        remainder_gram: Math.round(remainder),
        final_gram: Math.round(totalGram),
      });
    } else {
      fillingCalc.push({
        filling_type: fillingType,
        total_gram: Math.round(totalGram),
        takaran_per_loyang: takaranPerLoyang,
        loyang_needed: neededLoyang,
        final_gram: Math.round(totalGram),
      });
    }
  }

  // 5) Construct response
  return {
    date,
    breakdown_production: breakdownProduction,
    dough_calc: doughCalc,
    filling_calc: fillingCalc,
    raw_totals: totals,
  };
}

module.exports = {
  calculateKitchenProduction,
  // expose configs to allow runtime adjustment
  itemConfig,
  fillingConfig,
  loyangCapacities,
};
