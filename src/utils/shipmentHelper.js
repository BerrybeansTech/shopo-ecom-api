const shiprocketService = require('../services/shiprocket.service');
const Orders = require('../models/orders/order.model');

const processShiprocketShipment = async (orderId, transaction = null) => {
    console.log("🚀 [Shiprocket] Starting shipment process for Order ID:", orderId);
    try {
        const order = await Orders.findByPk(orderId, {
            include: ['Customer', 'OrderItems'],
            transaction
        });

        if (!order) {
            console.error("❌ [Shiprocket] Order not found in DB:", orderId);
            return;
        }

        const Address = require('../models/customer/customerAddress.model');
        let customerPhone = order.Customer?.phone;
        if (!customerPhone) {
            const address = await Address.findOne({
                where: { customerId: order.customerId },
                order: [['isDefault', 'DESC'], ['updatedAt', 'DESC']],
                transaction
            });
            customerPhone = address?.phone;
        }

        if (!customerPhone) {
            throw new Error("Customer phone number is missing. Cannot create Shiprocket shipment.");
        }

        // Format phone number to exactly 10 digits for Shiprocket
        const digits = customerPhone.replace(/\D/g, '');
        let formattedPhone = digits;
        if (digits.length === 12 && digits.startsWith('91')) {
            formattedPhone = digits.substring(2);
        } else if (digits.length === 11 && digits.startsWith('0')) {
            formattedPhone = digits.substring(1);
        } else if (digits.length > 10) {
            formattedPhone = digits.slice(-10);
        }
        
        if (formattedPhone.length !== 10) {
            console.warn(`⚠️ Phone number ${customerPhone} formatted to ${formattedPhone} is not 10 digits.`);
        }


        console.log("📦 [Shiprocket] Mapping payload for Order #", order.id);
        // Map internal order to Shiprocket format
        const shiprocketData = {
            order_id: order.id,
            order_date: order.createdAt,
            pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || "Primary",
            billing_customer_name: order.Customer?.name || "Customer",
            billing_last_name: "",
            billing_address: order.shippingAddress,
            billing_city: order.Customer?.city || "Tiruvannamalai", 
            billing_pincode: order.Customer?.postalCode || "604408",
            billing_state: order.Customer?.state || "Tamil Nadu",
            billing_country: order.Customer?.country || "India",
            billing_email: order.Customer?.email || "customer@example.com",
            billing_phone: formattedPhone,
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
            
            // Extract potential tracking info if returned (depends on Shiprocket API version/config)
            const awbCode = response.awb_code || response.shipment_track?.[0]?.awb_code;
            const courierName = response.courier_name || response.shipment_track?.[0]?.courier_name;

            await order.update({
                shiprocketOrderId: response.order_id,
                shipmentId: response.shipment_id,
                awbCode: awbCode || order.awbCode,
                courierName: courierName || order.courierName,
                shipmentStatus: 'pending',
                status: 'confirmed',
                shiprocketResponse: response
            }, { transaction });
            return { success: true, data: response };
        } else {
            throw new Error(response?.message || "Failed to create shipment on Shiprocket");
        }
    } catch (error) {
        const errorDetail = error.response?.data || error.message;
        console.error('❌ FULL SHIPROCKET ERROR:', JSON.stringify(errorDetail, null, 2));
        
        // Save the detailed error to the order and set shipmentStatus to 'failed'
        const order = await Orders.findByPk(orderId, { transaction });
        if (order) {
            await order.update({
                shipmentStatus: 'failed',
                shiprocketResponse: { 
                    error: errorDetail, 
                    timestamp: new Date(),
                    originalMessage: error.message 
                }
            }, { transaction });
        }
        return { success: false, error: errorDetail };
    }
};

module.exports = { processShiprocketShipment };
