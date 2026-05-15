const Razorpay = require('razorpay');
const express = require('express');
const router = express.Router();
const crypto = require('crypto');


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

const verifyPayment = (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const hash = crypto.createHmac('sha256', key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    console.log('Generated Hash:', hash);
    console.log('Received Signature:', razorpay_signature);

    if (hash === razorpay_signature) {
        res.json({ success: true, message: 'Payment verified successfully' });
    } else {
        res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
}




module.exports = { createOrder, verifyPayment }