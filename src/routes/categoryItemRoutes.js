const express = require("express");
const categoryItemController = require("../controllers/categoryItemController");
const router = express.Router();

router.post("/", categoryItemController.createCategoryItem);
router.get("/", categoryItemController.getAllCategoryItems);
router.get("/:id", categoryItemController.getCategoryItemById);
router.put("/:id", categoryItemController.updateCategoryItem);
router.delete("/:id", categoryItemController.deleteCategoryItem);

module.exports = router;
