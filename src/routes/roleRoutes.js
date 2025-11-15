const express = require("express");
const roleController = require("../controllers/roleController");
const router = express.Router();

router.post("/", roleController.createRole);
router.get("/", roleController.getAllRoles);
router.get("/:id", roleController.getRoleById);
router.put("/:id", roleController.updateRole);
router.delete("/:id", roleController.deleteRole);
router.post("/assign-permission", roleController.assignPermissionsToRole);

module.exports = router;
