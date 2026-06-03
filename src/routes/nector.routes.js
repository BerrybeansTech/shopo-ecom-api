const express = require("express");
const router = express.Router();
const nectorController = require("../controllers/nectorController");
const { authenticateToken } = require("../middlewares/authenticateJWT");

router.get("/lead-token", authenticateToken, nectorController.getLeadToken);
router.post("/webhook", nectorController.handleWebhook);
router.post("/validate-coupon", authenticateToken, nectorController.validateCoupon);

module.exports = router;
