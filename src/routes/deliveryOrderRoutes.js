const express = require("express");
const DeliveryOrderController = require("../controllers/deliveryOrderController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.use(authMiddleware);
router.post("/", DeliveryOrderController.createDeliveryOrder);
router.put("/approve/:id", DeliveryOrderController.approveDeliveryOrder);
router.get("/", DeliveryOrderController.getAllDeliveryOrders);
router.get("/:id", DeliveryOrderController.getDeliveryOrderById);
router.put("/:id", DeliveryOrderController.updateDeliveryOrder);
router.delete("/:id", DeliveryOrderController.deleteDeliveryOrder);

module.exports = router;
