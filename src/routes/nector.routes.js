const express = require("express");
const router = express.Router();
const nectorController = require("../controllers/nectorController");
const { authenticateToken } = require("../middlewares/authenticateJWT");

router.get("/lead-token", authenticateToken, nectorController.getLeadToken);
router.post("/webhook", nectorController.handleWebhook);
router.post("/validate-coupon", authenticateToken, nectorController.validateCoupon);
router.get("/settings", authenticateToken, nectorController.getSettings);
router.get("/logs", authenticateToken, nectorController.getLogs);
router.get("/webhook-logs", authenticateToken, nectorController.getWebhookLogs);
router.post("/sync-customer/:id", authenticateToken, nectorController.manualSyncCustomer);
router.post("/sync-order/:id", authenticateToken, nectorController.manualSyncOrder);

module.exports = router;
