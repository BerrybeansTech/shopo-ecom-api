const sequelize = require("../../config/db");
const Orders = require("../../models/orders/order.model");
const Product = require("../../models/product/product.model");
const OrderItems = require("../../models/orders/orderItems.model");
const Customer = require("../../models/customer/customers.model");

const getAllOrders = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve orders",
    });
  }
};

const getCustomerOrder = async (req, res) => {
  const { id } = req.params;
  const { page: pageQuery, limit: limitQuery } = req.query;

  try {
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
  } catch (error) {
    console.error("Error fetching order:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve order" });
  }
};

const getOrderDetial = async (req, res) => {
  const { id } = req.params;

  try {
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
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve order" });
  }
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

  try {
    const customer = await Customer.findByPk(customerId, { transaction: t });
    if (!customer) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
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
  } catch (error) {
    await t.rollback();
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

const updateOrder = async (req, res) => {
  const { id, orderNote, status } = req.body;

  try {
    const order = await Orders.findByPk(id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    await Orders.update({ orderNote, status }, { where: { id } });

    res.json({ success: true, message: "Order updated successfully" });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ success: false, message: "Failed to update order" });
  }
};

const deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Orders.findByPk(id);

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    await Orders.destroy({ where: { id } });

    res.json({
      success: true,
      message: "Order deleted successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ success: false, message: "Failed to delete order" });
  }
};

module.exports = {
  getAllOrders,
  getOrderDetial,
  getCustomerOrder,
  createOrder,
  updateOrder,
  deleteOrder,
};
