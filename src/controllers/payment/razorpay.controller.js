const Razorpay = require('razorpay');
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Orders = require('../../models/orders/order.model');
const { processShiprocketShipment } = require('../../utils/shipmentHelper');


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res) => {
    const { amount, currency, receipt, orderId } = req.body;

    const options = {
        amount: Math.round(amount), // Amount is already in paise from frontend
        currency,
        receipt: receipt || orderId,
        payment_capture: 1,
    };

    try {
        const order = await razorpay.orders.create(options);
        
        // Link Razorpay Order ID to the internal Order
        if (orderId) {
            await Orders.update(
                { razorpayOrderId: order.id },
                { where: { id: orderId } }
            );
        }

        res.json({ 
            success: true, 
            data: {
                razorpay_order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
}

const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    try {
        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        const hash = crypto.createHmac('sha256', key_secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (hash === razorpay_signature) {
            const whereClause = orderId ? { id: orderId } : { razorpayOrderId: razorpay_order_id };

            // Update order status in database
            const [updatedRows] = await Orders.update(
                { 
                    paymentStatus: 'paid', 
                    status: 'pending',
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature,
                    razorpayOrderId: razorpay_order_id
                },
                { where: whereClause }
            );

            // Fetch the order to get the database record and trigger Shiprocket
            const dbOrder = await Orders.findOne({ where: whereClause });
            if (dbOrder) {
                console.log(`🚛 Payment verified. Triggering Shiprocket gracefully for order: ${dbOrder.id}`);
                try {
                    await processShiprocketShipment(dbOrder.id);
                } catch (shiprocketError) {
                    console.error("❌ Graceful Shiprocket trigger error after payment verification:", shiprocketError);
                }
            } else {
                console.warn(`Payment verified for ${razorpay_order_id} but no matching order found in database.`);
            }

            res.json({ success: true, message: 'Payment verified and order updated successfully' });
        } else {
            res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ success: false, message: 'Internal server error during verification' });
    }
}




module.exports = { createOrder, verifyPayment }