const express = require("express");
const razorpayController = require("../controllers/payment/razorpay.controller");

const router = express.Router();

router.post("/create-razorpay-order", razorpayController.createOrder);
router.post("/verify-payment", razorpayController.verifyPayment);

module.exports = router;
