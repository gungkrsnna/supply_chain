const express = require("express");
const requestController = require("../controllers/requestController");
const authMiddleware = require("../middlewares/authMiddleware");
const router = express.Router();

router.use(authMiddleware);
router.post("/", requestController.createRequest);
router.get("/", requestController.getAllRequests);
router.get("/:id", requestController.getRequestById);
router.put("/:id", requestController.updateRequest);
router.delete("/:id", requestController.deleteRequest);

router.put("/approve/:id", requestController.approveRequest);
router.put("/reject/:id", requestController.rejectRequest);

module.exports = router;
