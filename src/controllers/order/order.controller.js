const sequelize = require('../db'); 
const Orders = require("../../models/orders/order.model");
const Product = require("../../models/product/product.model")
const OrderItems = require("../../models/orders/orderItems.model")

const getAllOrders = async (req, res) => {
  try {
    const { status, customerId, vendorId, page: pageQuery, limit: limitQuery } = req.query;

    const page = parseInt(pageQuery) || 1;
    const limit = parseInt(limitQuery) || 10;
    const offset = (page - 1) * limit;

    if (vendorId) {
      const whereClause = {};
      if (vendorId) whereClause.vendorId = vendorId;
      if (status) whereClause.status = status;
      if (customerId) whereClause.customerId = customerId;
      const { count, rows } = await Orders.findAndCountAll({
        where: { vendorId },
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
    }

    const whereClause = {};
    if (status) whereClause.status = status;
    if (customerId) whereClause.customerId = customerId;

    const { count, rows } = await Orders.findAndCountAll({
      where: whereClause,
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

  try {
    const order = await Orders.findByPk(id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve order" });
  }
};
const getOrderDetial = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Orders.findByPk(id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve order" });
  }
};

const createOrder = async (req, res) => {
  const { customerId, customerInfo, productInfo, subTotal, gstAmount, totalCost, status } = req.body;

  const t = await sequelize.transaction(); 

  try {
    const newOrder = await Orders.create({
      customerId,
      customerInfo,
      productInfo,
      subTotal,
      gstAmount,
      totalCost,
      status,
    }, { transaction: t });

    await Promise.all(
      productInfo.map(async (item) => {
        const productId = item.productId;

        const product = await Product.findByPk(productId, { transaction: t });

        if (product) {
          const currentTotal = parseInt(product.totalOrders || '0');
          await Orders.create({
            customerOrderId: newOrder.id,
            customerId,
            customerInfo,
            vendorId: product.postedBy,
            productInfo: item,
            subTotal: item.subTotal,
            gstAmount: item.gst,
            totalCost: item.total,
          }, { transaction: t })

          await product.update(
            { totalOrders: (currentTotal + 1).toString() },
            { transaction: t }
          );
        }
      })
    );

    await t.commit(); 

    res.json({
      success: true,
      message: "Order created successfully",
      data: newOrder,
    });
  } catch (error) {
    await t.rollback(); 
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: "Failed to create order" });
  }
};


const updateOrder = async (req, res) => {
  const { id, remark, status } = req.body;

  try {
    const order = await Orders.findByPk(id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    await Orders.update(
      { remark, status },
      { where: { id } }
    );

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
      return res.status(404).json({ success: false, message: "Order not found" });
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
