const sequelize = require('../../config/db');
const Orders = require("../../models/orders/order.model");
const Product = require("../../models/product/product.model");
const OrderItems = require("../../models/orders/orderItems.model");
const Customer = require("../../models/customer/customers.model");

const getAllOrders = async (req, res) => {
  const {
    status,
    customerId,
    page: pageQuery,
    limit: limitQuery,
  } = req.query;

  const page = parseInt(pageQuery) || 1;
  const limit = parseInt(limitQuery) || 10;
  const offset = (page - 1) * limit;

  const whereClause = {};
  if (status) whereClause.status = status;
  if (customerId) whereClause.customerId = customerId;

  const { count, rows } = await Orders.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Customer,
        as: "Customer",
      },
      {
        model: OrderItems,
        as: "OrderItems",
        include: [
          {
            model: Product,
            as: "Product",
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  });
};

const getCustomerOrder = async (req, res) => {
  const { id } = req.params;
  const { page: pageQuery, limit: limitQuery } = req.query;

  const page = parseInt(pageQuery) || 1;
  const limit = parseInt(limitQuery) || 10;
  const offset = (page - 1) * limit;

  const { count, rows } = await Orders.findAndCountAll({
    where: { customerId: id },
    include: [
      {
        model: Customer,
        as: "Customer",
      },
      {
        model: OrderItems,
        as: "OrderItems",
        include: [
          {
            model: Product,
            as: "Product",
          },
        ],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  });
};

const getOrderDetial = async (req, res) => {
  const { id } = req.params;

  const order = await Orders.findByPk(id, {
    include: [
      {
        model: Customer,
        as: "Customer",
      },
      {
        model: OrderItems,
        as: "OrderItems",
        include: [
          {
            model: Product,
            as: "Product",
          },
        ],
      },
    ],
  });

  if (!order) {
    const error = new Error("Order not found");
    error.status = 404;
    throw error;
  }

  res.json({ success: true, data: order });
};

const createOrder = async (req, res) => {
  const {
    customerId,
    totalItems,
    shippingAddress,
    subTotal,
    tax,
    shippingCharge,
    totalAmount,
    finalAmount,
    paymentMethod,
    orderNote,
    productItems,
  } = req.body;

  const t = await sequelize.transaction();

  const customer = await Customer.findByPk(customerId, { transaction: t });
  if (!customer) {
    await t.rollback();
    return res.status(404).json({
      success: false,
      message: "Customer not found"
    });
  }

  const newOrder = await Orders.create(
    {
      customerId,
      totalItems,
      shippingAddress,
      subTotal,
      tax,
      shippingCharge,
      totalAmount,
      finalAmount,
      paymentMethod,
      orderNote,
      paymentStatus: "pending",
      status: "pending",
    },
    { transaction: t }
  );

  if (
    productItems &&
    Array.isArray(productItems) &&
    productItems.length > 0
  ) {
    // Validate that all products exist
    const productIds = productItems.map(item => item.productId).filter(id => id);
    if (productIds.length > 0) {
      const existingProducts = await Product.findAll({
        where: { id: productIds },
        attributes: ['id'],
        transaction: t
      });

      const existingProductIds = existingProducts.map(p => p.id);
      const invalidProductIds = productIds.filter(id => !existingProductIds.includes(id));

      if (invalidProductIds.length > 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid product IDs: ${invalidProductIds.join(', ')}`
        });
      }
    }

    const itemsToCreate = productItems.map((item) => ({
      ...item,
      orderId: newOrder.id,
    }));
    await OrderItems.bulkCreate(itemsToCreate, { transaction: t });
  }

  await t.commit();

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    data: newOrder,
  });
};

const updateOrder = async (req, res) => {
  const { id, orderNote, status } = req.body;

  const order = await Orders.findByPk(id);

  if (!order) {
    const error = new Error("Order not found");
    error.status = 404;
    throw error;
  }

  await Orders.update({ orderNote, status }, { where: { id } });

  res.json({ success: true, message: "Order updated successfully" });
};

const deleteOrder = async (req, res) => {
  const { id } = req.params;

  const order = await Orders.findByPk(id);

  if (!order) {
    const error = new Error("Order not found");
    error.status = 404;
    throw error;
  }

  await Orders.destroy({ where: { id } });

  res.json({
    success: true,
    message: "Order deleted successfully",
    data: order,
  });
};

module.exports = {
  getAllOrders,
  getOrderDetial,
  getCustomerOrder,
  createOrder,
  updateOrder,
  deleteOrder,
};
