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
    const { amount, currency, receipt } = req.body;

    const options = {
        amount: amount * 100,
        currency,
        receipt,
        payment_capture: 1,
    };

    try {
        const order = await razorpay.orders.create(options);
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    try {
        const key_secret = process.env.RAZORPAY_KEY_SECRET;
        const hash = crypto.createHmac('sha256', key_secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (hash === razorpay_signature) {
            // Update order status in database
            const [updatedRows] = await Orders.update(
                { 
                    paymentStatus: 'paid', 
                    status: 'pending', // or 'processing' if you have that enum
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature
                },
                { where: { razorpayOrderId: razorpay_order_id } }
            );

            if (updatedRows === 0) {
                console.warn(`Payment verified for ${razorpay_order_id} but no matching order found in database.`);
            } else {
                // Find the order to get its ID and trigger shipment
                const order = await Orders.findOne({ where: { razorpayOrderId: razorpay_order_id } });
                if (order) {
                    processShiprocketShipment(order.id);
                }
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