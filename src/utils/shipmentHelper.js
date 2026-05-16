const shiprocketService = require('../services/shiprocket.service');
const Orders = require('../models/orders/order.model');

const processShiprocketShipment = async (orderId) => {
    console.log("🚀 [Shiprocket] Starting shipment process for Order ID:", orderId);
    try {
        const order = await Orders.findByPk(orderId, {
            include: ['Customer', 'OrderItems']
        });

        if (!order) {
            console.error("❌ [Shiprocket] Order not found in DB:", orderId);
            return;
        }

        console.log("📦 [Shiprocket] Mapping payload for Order #", order.id);
        // Map internal order to Shiprocket format
        const shiprocketData = {
            order_id: order.id,
            order_date: order.createdAt,
            pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
            billing_customer_name: order.Customer.name,
            billing_last_name: "",
            billing_address: order.shippingAddress,
            billing_city: order.Customer.city || "Tiruvannamalai", 
            billing_pincode: order.Customer.postalCode || "604408",
            billing_state: order.Customer.state || "Tamil Nadu",
            billing_country: order.Customer.country || "India",
            billing_email: order.Customer.email,
            billing_phone: order.Customer.phone,
            shipping_is_billing: true,
            order_items: order.OrderItems.map(item => ({
                name: item.productName,
                sku: `SKU-${item.productId}`,
                units: item.quantity,
                selling_price: item.unitPrice,
                discount: "",
                tax: "",
                hsn: ""
            })),
            payment_method: order.paymentMethod?.trim().toLowerCase() === 'cod' ? 'COD' : 'Prepaid',
            shipping_charges: order.shippingCharge,
            giftwrap_charges: 0,
            transaction_charges: 0,
            total_discount: 0,
            sub_total: order.subTotal,
            length: parseFloat(process.env.SHIPROCKET_DEFAULT_LENGTH) || 10,
            breadth: parseFloat(process.env.SHIPROCKET_DEFAULT_BREADTH) || 10,
            height: parseFloat(process.env.SHIPROCKET_DEFAULT_HEIGHT) || 10,
            weight: parseFloat(process.env.SHIPROCKET_DEFAULT_WEIGHT) || 0.5
        };

        console.log("📤 [Shiprocket] Sending Request to Shiprocket...");
        console.log("📝 [Shiprocket] Payload:", JSON.stringify(shiprocketData, null, 2));

        const response = await shiprocketService.createShipment(shiprocketData);

        if (response && response.order_id) {
            console.log("✅ [Shiprocket] Shipment Created Successfully! Shiprocket Order ID:", response.order_id);
            await order.update({
                shiprocketOrderId: response.order_id,
                shipmentId: response.shipment_id,
                shipmentStatus: 'pending',
                shiprocketResponse: response
            });
            return response;
        }
    } catch (error) {
        const errorDetail = error.response?.data || error.message;
        console.error('❌ FULL SHIPROCKET ERROR:', JSON.stringify(errorDetail, null, 2));
        
        // Save the detailed error to the order
        const order = await Orders.findByPk(orderId);
        if (order) {
            await order.update({
                shiprocketResponse: { 
                    error: errorDetail, 
                    timestamp: new Date(),
                    originalMessage: error.message 
                }
            });
        }
    }
};

module.exports = { processShiprocketShipment };
