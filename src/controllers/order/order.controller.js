const sequelize = require('../../config/db');
const Orders = require("../../models/orders/order.model");
const Product = require("../../models/product/product.model");
const OrderItems = require("../../models/orders/orderItems.model");
const Customer = require("../../models/customer/customers.model");
const Invoice = require("../../models/orders/invoice.model");
const { processShiprocketShipment } = require("../../utils/shipmentHelper");
const shiprocketService = require("../../services/shiprocket.service");


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

    const host = req.get("host");
    const protocol = host && host.includes("localhost") ? req.protocol : "https";
    const baseUrl = `${protocol}://${host}/`;

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
        {
          model: Invoice,
          as: "invoice",
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const updatedRows = rows.map(order => {
      const orderJson = order.toJSON();

      orderJson.OrderItems = orderJson.OrderItems.map(item => {
        if (item.Product) {
          let galleryArray = [];
          if (item.Product.galleryImage) {
            try {
              const rawGallery = Array.isArray(item.Product.galleryImage)
                ? item.Product.galleryImage
                : JSON.parse(item.Product.galleryImage);
              
              galleryArray = (Array.isArray(rawGallery) ? rawGallery : [rawGallery])
                .flatMap(i => typeof i === "string" ? i.split(",") : i)
                .filter(Boolean);
            } catch (err) {
              galleryArray = typeof item.Product.galleryImage === "string" 
                ? item.Product.galleryImage.split(",").filter(Boolean) 
                : [];
            }
          }

          item.Product.thumbnailImage = item.Product.thumbnailImage
            ? `${baseUrl}${item.Product.thumbnailImage.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`
            : null;

          item.Product.galleryImage = galleryArray.map(
            img => `${baseUrl}${img.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`
          );
        }
        return item;
      });

      return orderJson;
    });

    return res.status(200).json({
      success: true,
      data: updatedRows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });

  } catch (error) {
    console.error("Error fetching orders:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders",
      error: error.message,
    });
  }
};

const getCustomerOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { page: pageQuery, limit: limitQuery } = req.query;

    const page = parseInt(pageQuery) || 1;
    const limit = parseInt(limitQuery) || 10;
    const offset = (page - 1) * limit;

    const host = req.get("host");
    const protocol = host && host.includes("localhost") ? req.protocol : "https";
    const baseUrl = `${protocol}://${host}/`;

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
        {
          model: Invoice,
          as: "invoice",
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const updatedRows = rows.map(order => {
      const orderJson = order.toJSON();

      orderJson.OrderItems = orderJson.OrderItems.map(item => {
        if (item.Product) {
          let galleryArray = [];
          if (item.Product.galleryImage) {
            try {
              const rawGallery = Array.isArray(item.Product.galleryImage)
                ? item.Product.galleryImage
                : JSON.parse(item.Product.galleryImage);
              
              galleryArray = (Array.isArray(rawGallery) ? rawGallery : [rawGallery])
                .flatMap(i => typeof i === "string" ? i.split(",") : i)
                .filter(Boolean);
            } catch (err) {
              galleryArray = typeof item.Product.galleryImage === "string" 
                ? item.Product.galleryImage.split(",").filter(Boolean) 
                : [];
            }
          }

          item.Product.thumbnailImage = item.Product.thumbnailImage
            ? `${baseUrl}${item.Product.thumbnailImage.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`
            : null;

          item.Product.galleryImage = galleryArray.map(
            img => `${baseUrl}${img.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`
          );
        }
        return item;
      });

      return orderJson;
    });

    return res.status(200).json({
      success: true,
      data: updatedRows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });

  } catch (error) {
    console.error("Error fetching customer orders:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve customer orders",
      error: error.message,
    });
  }
};


const getOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const host = req.get("host");
    const protocol = host && host.includes("localhost") ? req.protocol : "https";
    const baseUrl = `${protocol}://${host}/`;

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
        {
          model: Invoice,
          as: "invoice",
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const orderJson = order.toJSON();

    orderJson.OrderItems = orderJson.OrderItems.map(item => {
      if (item.Product) {
        let galleryArray = [];
        if (item.Product.galleryImage) {
          try {
            galleryArray = Array.isArray(item.Product.galleryImage)
              ? item.Product.galleryImage
              : JSON.parse(item.Product.galleryImage);
          } catch (err) {
            console.error("Invalid galleryImage JSON:", item.Product.galleryImage);
            galleryArray = [];
          }
        }

        item.Product.thumbnailImage = item.Product.thumbnailImage
          ? `${baseUrl}${item.Product.thumbnailImage.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`
          : null;

        item.Product.galleryImage = galleryArray.map(
          img => `${baseUrl}${img.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`
        );
      }
      return item;
    });

    return res.status(200).json({
      success: true,
      data: orderJson,
    });

  } catch (error) {
    console.error("Error fetching order detail:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve order detail",
      error: error.message,
    });
  }
};


const createOrder = async (req, res) => {
  let t;
  try {
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

    t = await sequelize.transaction();

    const customer = await Customer.findByPk(customerId, { transaction: t });
    if (!customer) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Customer not found",
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
        razorpayOrderId: req.body.razorpayOrderId || null,
        paymentStatus: "pending",
        status: "pending",
      },
      { transaction: t }
    );

    if (productItems && Array.isArray(productItems) && productItems.length > 0) {
      const productIds = productItems.map(item => item.productId).filter(id => id);

      if (productIds.length > 0) {
        const existingProducts = await Product.findAll({
          where: { id: productIds },
          attributes: ["id"],
          transaction: t,
        });

        const existingProductIds = existingProducts.map(p => p.id);
        const invalidProductIds = productIds.filter(
          id => !existingProductIds.includes(id)
        );

        if (invalidProductIds.length > 0) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: `Invalid product IDs: ${invalidProductIds.join(", ")}`,
          });
        }
      }

      const itemsToCreate = productItems.map(item => ({
        ...item,
        orderId: newOrder.id,
      }));

      await OrderItems.bulkCreate(itemsToCreate, { transaction: t });
    }

    await t.commit();
    console.log("💳 Payment Method Received:", paymentMethod);

    const normalizedPaymentMethod = paymentMethod?.trim().toLowerCase();
    console.log("💳 Normalized Payment Method:", normalizedPaymentMethod);

    // Trigger Shiprocket for COD orders
    if (normalizedPaymentMethod === 'cod') {
        console.log("🚛 Triggering Shiprocket for COD Order...");
        await processShiprocketShipment(newOrder.id);
    } else {
        console.log("ℹ️ Shiprocket skipped: Payment method is not 'cod' (Current:", paymentMethod, ")");
    }

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: newOrder,
    });
  } catch (error) {
    if (t && !t.finished) {
        try {
            await t.rollback();
        } catch (rollbackError) {
            console.error("Rollback failed:", rollbackError.message);
        }
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

const updateOrder = async (req, res) => {
  try {
    const { id, orderNote, status } = req.body;

    const order = await Orders.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    await Orders.update({ orderNote, status }, { where: { id } });

    return res.json({
      success: true,
      message: "Order updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update order",
      error: error.message,
    });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Orders.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    await Orders.destroy({ where: { id } });

    return res.json({
      success: true,
      message: "Order deleted successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete order",
      error: error.message,
    });
  }
};

const trackOrder = async (req, res) => {
  try {
    const { id } = req.params; // Internal Order ID
    const order = await Orders.findByPk(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!order.shipmentId) {
      return res.status(400).json({
        success: false,
        message: "Shipment not yet created for this order",
      });
    }

    const trackingData = await shiprocketService.trackShipment(order.shipmentId);

    return res.status(200).json({
      success: true,
      data: trackingData,
    });
  } catch (error) {
    console.error("Error tracking order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to track order",
      error: error.message,
    });
  }
};


module.exports = {
  getAllOrders,
  getOrderDetail,
  getCustomerOrder,
  createOrder,
  updateOrder,
  deleteOrder,
  trackOrder,
};

