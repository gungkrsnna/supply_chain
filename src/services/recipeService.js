const db = require('../models'); // adjust path
const { Op } = require('sequelize');

const Recipe = db.Recipe;
const RecipeComponent = db.RecipeComponent;
const Item = db.Item;

const RecipeService = {
  async createRecipe(payload) {
    const t = await db.sequelize.transaction();
    try {
      const recipe = await Recipe.create({
        item_id: payload.item_id,
        name: payload.name,
        version: payload.version,
        yield_qty: payload.yield_qty ?? 1,
        uom_id: payload.uom_id ?? null,
        is_active: payload.is_active ? true : false,
        notes: payload.notes ?? null
      }, { transaction: t });

      if (Array.isArray(payload.components) && payload.components.length) {
        const comps = payload.components.map(c => ({
          recipe_id: recipe.id,
          component_item_id: c.component_item_id,
          quantity: c.quantity,
          uom_id: c.uom_id ?? null,
          waste_percent: c.waste_percent ?? 0,
          sequence: c.sequence ?? 0,
          is_optional: !!c.is_optional,
          notes: c.notes ?? null
        }));
        await RecipeComponent.bulkCreate(comps, { transaction: t });
      }

      if (recipe.is_active) {
        // deactivate other recipes for same item
        await Recipe.update({ is_active: false }, { where: { item_id: recipe.item_id, id: { [Op.ne]: recipe.id } }, transaction: t });
      }

      await t.commit();
      return recipe;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async updateRecipe(id, payload) {
    const t = await db.sequelize.transaction();
    try {
      const recipe = await Recipe.findByPk(id, { transaction: t });
      if (!recipe) throw { status: 404, message: 'Recipe not found' };

      await recipe.update({
        name: payload.name ?? recipe.name,
        version: payload.version ?? recipe.version,
        yield_qty: payload.yield_qty ?? recipe.yield_qty,
        uom_id: payload.uom_id ?? recipe.uom_id,
        is_active: typeof payload.is_active === 'boolean' ? payload.is_active : recipe.is_active,
        notes: payload.notes ?? recipe.notes
      }, { transaction: t });

      // replace components (delete then bulk insert)
      await RecipeComponent.destroy({ where: { recipe_id: id }, transaction: t });

      if (Array.isArray(payload.components) && payload.components.length) {
        const comps = payload.components.map(c => ({
          recipe_id: id,
          component_item_id: c.component_item_id,
          quantity: c.quantity,
          uom_id: c.uom_id ?? null,
          waste_percent: c.waste_percent ?? 0,
          sequence: c.sequence ?? 0,
          is_optional: !!c.is_optional,
          notes: c.notes ?? null
        }));
        await RecipeComponent.bulkCreate(comps, { transaction: t });
      }

      if (recipe.is_active) {
        await Recipe.update({ is_active: false }, { where: { item_id: recipe.item_id, id: { [Op.ne]: recipe.id } }, transaction: t });
      }

      await t.commit();
      return recipe;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async deleteRecipe(id) {
    const t = await db.sequelize.transaction();
    try {
      await RecipeComponent.destroy({ where: { recipe_id: id }, transaction: t });
      await Recipe.destroy({ where: { id }, transaction: t });
      await t.commit();
      return true;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async getRecipeDetail(id) {
    return Recipe.findByPk(id, {
      include: [
        { model: RecipeComponent, as: 'components', include: [{ model: Item, as: 'componentItem', attributes: ['id','name','uom_id'] }] },
        { model: Item, as: 'item', attributes: ['id','name'] }
      ]
    });
  },

  async listRecipesForItem(itemId) {
    return Recipe.findAll({ where: { item_id: itemId }, order: [['createdAt','DESC']] });
  },

  async activateRecipe(id) {
    const t = await db.sequelize.transaction();
    try {
      const recipe = await Recipe.findByPk(id, { transaction: t });
      if (!recipe) throw { status: 404, message: 'Recipe not found' };
      await Recipe.update({ is_active: false }, { where: { item_id: recipe.item_id }, transaction: t });
      await recipe.update({ is_active: true }, { transaction: t });
      await t.commit();
      return true;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  // flatten recipe recursively to raw materials
  async flattenRecipe(id, options = {}) {
    const maxDepth = options.maxDepth ?? 20;
    const visited = new Set();

    const accumulator = {};

    const recurse = async (recipeId, multiplier, depth) => {
      if (depth > maxDepth) throw new Error('Max recursion reached (possible circular reference)');
      if (visited.has(recipeId)) throw new Error('Circular recipe detected');
      visited.add(recipeId);

      const recipe = await Recipe.findByPk(recipeId, { include: [{ model: RecipeComponent, as: 'components' }]});
      if (!recipe) {
        visited.delete(recipeId);
        return;
      }

      for (const comp of recipe.components) {
        const qty = parseFloat(comp.quantity) * multiplier;
        // check if component item has an active recipe
        const activeRecipe = await Recipe.findOne({ where: { item_id: comp.component_item_id, is_active: true }});
        if (activeRecipe) {
          const scale = qty / (parseFloat(activeRecipe.yield_qty) || 1);
          await recurse(activeRecipe.id, scale, depth + 1);
        } else {
          accumulator[comp.component_item_id] = (accumulator[comp.component_item_id] || 0) + qty;
        }
      }

      visited.delete(recipeId);
    };

    await recurse(id, 1, 0);
    return accumulator; // { itemId: qty }
  },

   async listRecipesForBrand(brandId, options = {}) {
    if (!brandId) throw { status: 400, message: 'brandId required' };

    // pastikan models tersedia
    if (!db || !db.Brand || !db.Item || !db.Recipe) {
      throw { status: 500, message: 'Models not available' };
    }

    // ambil brand untuk kode
    const brand = await db.Brand.findByPk(brandId, { attributes: ['id','kode','nama'] });
    if (!brand) return [];

    const kode = (brand.kode || '').trim();
    if (!kode) return [];

    const mode = options.patternMode || 'contains';
    const pattern = mode === 'prefix' ? `${kode}%` : `%${kode}%`;

    // cari items yang code cocok
    const items = await db.Item.findAll({
      where: { code: { [Op.like]: pattern } },
      attributes: ['id', 'code', 'name']
    });

    const itemIds = items.map(i => i.id);
    if (!itemIds.length) return [];

    // ambil recipes untuk items tersebut (include komponen & item info)
    const recipes = await db.Recipe.findAll({
      where: { item_id: { [Op.in]: itemIds } },
      include: [
        { model: db.RecipeComponent, as: 'components', include: [{ model: db.Item, as: 'componentItem', attributes: ['id','name','code'] }] },
        { model: db.Item, as: 'item', attributes: ['id','name','code'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    return recipes;
  },
};

module.exports = RecipeService;
