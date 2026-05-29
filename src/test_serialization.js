const dotenv = require('dotenv');
dotenv.config();

const db = require('./config/db');
require('./utils/relationship'); // Load relationships
const Customer = require('./models/customer/customers.model');
const Orders = require('./models/orders/order.model');
const OrderItems = require('./models/orders/orderItems.model');

async function testFullFlow() {
  let t;
  try {
    await db.authenticate();
    console.log("DB connected");

    // Clear tables
    await OrderItems.destroy({ where: {} });
    await Orders.destroy({ where: {} });
    await Customer.destroy({ where: {} });

    // Create a customer
    const customer = await Customer.create({
      id: '8178b011-c419-438e-b0c0-ddd303b1f7e6',
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '1234567890',
      password: 'password',
      wishList: []
    });
    console.log("Created Customer");

    // Create an order
    const newOrder = await Orders.create({
      customerId: customer.id,
      totalItems: 1,
      shippingAddress: 'Test Address',
      subTotal: 100,
      tax: 18,
      totalCGST: 9,
      totalSGST: 9,
      totalIGST: 0,
      shippingCharge: 80,
      totalAmount: 198,
      finalAmount: 198,
      paymentMethod: 'COD',
      orderNote: 'Urgent delivery',
      paymentStatus: 'pending',
      status: 'pending'
    });
    console.log("Created Order:", newOrder.id);

    // Create Order Items
    await OrderItems.create({
      orderId: newOrder.id,
      productId: null,
      productName: 'Test Product',
      quantity: 1,
      unitPrice: 100,
      totalPrice: 100
    });
    console.log("Created Order Item");

    // Fetch and serialize
    const fetchedOrder = await Orders.findByPk(newOrder.id, {
      include: [
        {
          model: OrderItems,
          as: "OrderItems",
        }
      ]
    });

    console.log("Fetched Order from DB");
    const jsonStr = JSON.stringify(fetchedOrder.toJSON());
    console.log("SUCCESS! JSON string length:", jsonStr.length);
    console.log("JSON Output:", jsonStr);

    process.exit(0);
  } catch (error) {
    console.error("FAILED! Error details:");
    console.error(error);
    process.exit(1);
  }
}

testFullFlow();
