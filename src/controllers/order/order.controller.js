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
      shippingState,
      subTotal,
      tax,
      shippingCharge,
      totalAmount,
      finalAmount,
      paymentMethod,
      orderNote,
      productItems,
    } = req.body;

    // GST Calculation Logic (Backend as Source of Truth)
    const sellerState = "Karnataka";
    const isSameState = shippingState?.toLowerCase().trim() === sellerState.toLowerCase().trim();

    const productIds = productItems.map(item => item.productId).filter(id => id);
    const dbProducts = await Product.findAll({ where: { id: productIds } });
    const productMap = dbProducts.reduce((map, p) => {
      map[p.id] = p;
      return map;
    }, {});

    let calculatedSubTotal = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let calculatedTotalTax = 0;

    const processedProductItems = productItems.map(item => {
      const product = productMap[item.productId];
      const gstPercentage = product ? parseFloat(product.gst || 0) : 0;
      const unitPrice = parseFloat(item.unitPrice || product?.sellingPrice || 0);
      const quantity = parseInt(item.quantity || 1);
      const itemTotal = unitPrice * quantity;

      calculatedSubTotal += itemTotal;

      let cgst = 0, sgst = 0, igst = 0;
      const gstAmount = (itemTotal * gstPercentage) / 100;

      if (isSameState) {
        cgst = gstAmount / 2;
        sgst = gstAmount / 2;
        totalCGST += cgst;
        totalSGST += sgst;
      } else {
        igst = gstAmount;
        totalIGST += igst;
      }

      calculatedTotalTax += gstAmount;

      return {
        ...item,
        unitPrice,
        totalPrice: itemTotal,
        gst: gstPercentage,
        cgst,
        sgst,
        igst
      };
    });

    const finalCalculatedTotal = calculatedSubTotal + calculatedTotalTax + (parseFloat(shippingCharge) || 0);

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
        subTotal: calculatedSubTotal,
        tax: calculatedTotalTax,
        totalCGST,
        totalSGST,
        totalIGST,
        shippingCharge,
        totalAmount: finalCalculatedTotal,
        finalAmount: finalCalculatedTotal,
        paymentMethod,
        orderNote,
        razorpayOrderId: req.body.razorpayOrderId || null,
        paymentStatus: "pending",
        status: "pending",
      },
      { transaction: t }
    );

    if (processedProductItems && Array.isArray(processedProductItems) && processedProductItems.length > 0) {
      const itemsToCreate = processedProductItems.map(item => ({
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

    // Default response if shipment not yet created or tracked
    const defaultResponse = {
      orderId: order.id,
      awbCode: order.awbCode || "Pending",
      courier: order.courierName || "Assigning Courier",
      status: "Order Placed",
      estimatedDelivery: "TBA",
      trackingUrl: order.trackingUrl || null,
      timeline: [
        {
          time: order.createdAt,
          activity: "Order Placed",
          location: "Rabbit Finch"
        }
      ]
    };

    if (!order.shipmentId) {
      return res.status(200).json({
        success: true,
        data: defaultResponse,
      });
    }

    try {
      const trackingData = await shiprocketService.trackShipment(order.shipmentId);

      // Shiprocket tracking response structure: response.tracking_data.shipment_track[0]
      const track = trackingData?.tracking_data?.shipment_track?.[0];
      const activities = track?.shipment_track_activities || [];

      const responseData = {
        orderId: order.id,
        awbCode: track?.awb_code || order.awbCode || "Pending",
        courier: track?.courier_name || order.courierName || "Shiprocket",
        status: track?.current_status || order.shipmentStatus || "In Transit",
        estimatedDelivery: track?.edd || order.estimatedDelivery || "TBA",
        trackingUrl: track?.tracking_url || order.trackingUrl || null,
        timeline: activities.length > 0 ? activities.map(activity => ({
          time: activity.date,
          activity: activity.activity,
          location: activity.location
        })) : defaultResponse.timeline
      };

      // Sync DB if status or EDD updated
      if (track?.current_status || track?.edd) {
        await order.update({
          shipmentStatus: track?.current_status || order.shipmentStatus,
          estimatedDelivery: track?.edd || order.estimatedDelivery,
          awbCode: track?.awb_code || order.awbCode,
          courierName: track?.courier_name || order.courierName,
          trackingUrl: track?.tracking_url || order.trackingUrl
        });
      }

      return res.status(200).json({
        success: true,
        data: responseData,
      });
    } catch (shiprocketError) {
      console.warn("⚠️ [Shiprocket] Tracking API failed, returning DB status:", shiprocketError.message);
      return res.status(200).json({
        success: true,
        data: defaultResponse,
      });
    }
  } catch (error) {
    console.error("Error tracking order:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to track order",
      error: error.message,
    });
  }
};

const createShiprocketShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Orders.findByPk(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.shiprocketOrderId) {
      return res.status(400).json({
        success: false,
        message: `Shipment already created with Shiprocket Order ID: ${order.shiprocketOrderId}`,
      });
    }

    const response = await processShiprocketShipment(order.id);

    if (response && response.order_id) {
      return res.status(200).json({
        success: true,
        message: "Shiprocket shipment created successfully",
        data: response,
      });
    } else {
      const updatedOrder = await Orders.findByPk(id);
      const errorMsg = updatedOrder.shiprocketResponse?.error || updatedOrder.shiprocketResponse?.originalMessage || "Failed to create shipment on Shiprocket";
      return res.status(500).json({
        success: false,
        message: "Failed to create Shiprocket shipment",
        error: errorMsg,
      });
    }
  } catch (error) {
    console.error("Error creating Shiprocket shipment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during shipment creation",
      error: error.message,
    });
  }
};

const cancelShiprocketShipment = async (req, res) => {
  try {
    const { id } = req.params;
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
        message: "No active shipment found for this order to cancel",
      });
    }

    console.log("🚛 Cancelling Shiprocket shipment for Shipment ID:", order.shipmentId);
    const response = await shiprocketService.cancelShipment([order.shipmentId]);

    await order.update({
      shipmentStatus: 'cancelled',
      status: 'cancelled',
      shiprocketResponse: {
        ...order.shiprocketResponse,
        cancellationResponse: response,
        cancelledAt: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      message: "Shiprocket shipment cancelled successfully",
      data: response,
    });
  } catch (error) {
    console.error("Error cancelling Shiprocket shipment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel Shiprocket shipment",
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
  createShiprocketShipment,
  cancelShiprocketShipment,
};

