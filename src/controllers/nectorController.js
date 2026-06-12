const axiosInstance = require("../services/nector.service");
const axiosPlain = require("axios");
const NectorLogs = require("../models/nector/nectorLogs.model");
const NectorWebhookLogs = require("../models/nector/nectorWebhookLogs.model");
const Customers = require("../models/customer/customers.model");
const Coupon = require("../models/offers/coupon.model");
const OrderItems = require("../models/orders/orderItems.model");
const crypto = require("crypto");
const { Op } = require("sequelize");

/**
 * Helper to record Nector activity logs.
 */
const logActivity = async (customerId, eventType, payload, response, status) => {
  try {
    await NectorLogs.create({
      customer_id: customerId,
      event_type: eventType,
      payload,
      response,
      status
    });
  } catch (err) {
    console.error("❌ Failed to write Nector log:", err.message);
  }
};

/**
 * Synchronize customer details with Nector via Webhook Integration.
 */
exports.syncCustomer = async (user, topic = "customer_created") => {
  const webhookId = process.env.NECTOR_WEBHOOK_ID || process.env.NECTOR_WEBHOOK_SECRET;
  if (!webhookId) {
    console.error("❌ NECTOR_WEBHOOK_ID or NECTOR_WEBHOOK_SECRET is not configured in environment variables.");
    return false;
  }

  const nameParts = (user.name || "").trim().split(/\s+/);
  const first_name = nameParts[0] || "";
  const last_name = nameParts.slice(1).join(" ") || "";

  // Normalize country to 3-letter lower case (default "ind" as per Indian localization)
  let countryCode = "ind";
  if (user.country) {
    const c = user.country.trim().toLowerCase();
    if (c === "india" || c === "in" || c === "ind") {
      countryCode = "ind";
    } else if (c === "usa" || c === "us" || c === "united states") {
      countryCode = "usa";
    } else if (c.length === 3) {
      countryCode = c;
    } else {
      countryCode = c.substring(0, 3);
    }
  }

  // Prefix custom- is required for custom platform integrations so that the webhook ID matches the SDK queried ID.
  const payload = {
    id: `custom-${user.customer_uuid}`,
    first_name,
    last_name,
    email: user.email,
    mobile: user.phone || "",
    country: countryCode,
    meta_data: []
  };

  const deliveryId = crypto.randomUUID();

  // ===== DEBUG LOGGING =====
  console.log("===== NECTOR WEBHOOK CUSTOMER SYNC DEBUG =====");
  console.log("Topic:", topic);
  console.log("Delivery ID:", deliveryId);
  console.log("Webhook ID:", webhookId);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("==============================================");

  try {
    const response = await axiosPlain.post(
      `https://platform.nector.io/api/open/integrations/customwebsitewebhook/${webhookId}`,
      payload,
      {
        headers: {
          "x-custom-website-topic": topic,
          "x-custom-website-delivery-id": deliveryId,
          "content-type": "application/json"
        }
      }
    );

    await logActivity(user.customer_uuid, `customer_${topic}`, payload, response.data, "success");
    console.log(`✅ [Nector] Customer webhook sync (${topic}) succeeded. Nector ID: custom-${user.customer_uuid}`);
    return `custom-${user.customer_uuid}`;
  } catch (err) {
    const errorData = err.response?.data || { message: err.message };
    console.error(`❌ [Nector] Customer webhook sync (${topic}) failed:`, JSON.stringify(errorData, null, 2));
    await logActivity(user.customer_uuid, `customer_${topic}`, payload, errorData, "failed");
    return false;
  }
};

/**
 * Synchronize order details with Nector via Webhook Integration.
 */
exports.syncOrder = async (order, user) => {
  const webhookId = process.env.NECTOR_WEBHOOK_ID || process.env.NECTOR_WEBHOOK_SECRET;
  if (!webhookId) {
    console.error("❌ NECTOR_WEBHOOK_ID or NECTOR_WEBHOOK_SECRET is not configured in environment variables.");
    return false;
  }

  // Load OrderItems
  let items = [];
  try {
    items = await OrderItems.findAll({ where: { orderId: order.id } });
  } catch (err) {
    console.error("❌ Failed to fetch order items for Nector sync:", err.message);
  }

  // Map order status
  let nectorStatus = "pending";
  const localStatus = (order.status || "").toLowerCase();
  if (localStatus === "delivered" || localStatus === "complete") {
    nectorStatus = "completed";
  } else if (localStatus === "cancelled") {
    nectorStatus = "cancelled";
  } else if (localStatus === "returned") {
    nectorStatus = "refunded";
  } else if (localStatus === "shipped" || localStatus === "confirmed") {
    nectorStatus = "processing";
  } else {
    nectorStatus = "pending";
  }

  // Map financial status (payment)
  let financialStatus = "pending";
  const localPaymentStatus = (order.paymentStatus || "").toLowerCase();
  if (localPaymentStatus === "paid" || localStatus === "delivered" || localStatus === "complete") {
    financialStatus = "paid";
  } else if (localPaymentStatus === "refunded") {
    financialStatus = "refunded";
  } else if (localPaymentStatus === "failed") {
    financialStatus = "voided";
  } else {
    financialStatus = "pending";
  }

  // Map fulfillment/delivery status
  let fulfillmentStatus = "unfulfilled";
  const localShipmentStatus = (order.shipmentStatus || "").toLowerCase();
  if (localShipmentStatus === "delivered" || localStatus === "delivered" || localStatus === "complete") {
    fulfillmentStatus = "fulfilled";
  } else if (localShipmentStatus === "shipped" || localShipmentStatus === "in_transit" || localStatus === "shipped") {
    fulfillmentStatus = "partial";
  } else if (localShipmentStatus === "returned" || localStatus === "returned") {
    fulfillmentStatus = "restocked";
  } else {
    fulfillmentStatus = "unfulfilled";
  }

  // Format customer object
  const nameParts = (user.name || "").trim().split(/\s+/);
  const first_name = nameParts[0] || "";
  const last_name = nameParts.slice(1).join(" ") || "";

  let countryCode = "ind";
  if (user.country) {
    const c = user.country.trim().toLowerCase();
    if (c === "india" || c === "in" || c === "ind") {
      countryCode = "ind";
    } else if (c === "usa" || c === "us" || c === "united states") {
      countryCode = "usa";
    } else if (c.length === 3) {
      countryCode = c;
    } else {
      countryCode = c.substring(0, 3);
    }
  }

  // Per Nector docs: customer id in order payload should also be prefixed with custom- for custom platforms
  const customerObj = {
    id: `custom-${user.customer_uuid}`,
    first_name,
    last_name,
    email: user.email,
    mobile: user.phone || "",
    country: countryCode,
    meta_data: []
  };

  // Map product lines
  const productLines = items.map(item => ({
    id: String(item.id),
    product_id: String(item.productId),
    name: item.productName || "Product",
    quantity: item.quantity,
    price: item.unitPrice,
    discount: 0
  }));

  // Map discount lines if order has a coupon code
  const discountLines = [];
  if (order.couponCode && order.couponDiscount) {
    discountLines.push({
      id: order.couponCode,
      code: order.couponCode,
      discount: order.couponDiscount,
      discount_type: "fixed"
    });
  }

  const payload = {
    id: order.id,
    created_at: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
    status: nectorStatus,
    financial_status: financialStatus,
    fulfillment_status: fulfillmentStatus,
    delivery_status: fulfillmentStatus === "fulfilled" ? "delivered" : "pending",
    name: `Order #${order.id}`,
    currency: "inr",
    total: parseFloat(order.subTotal || 0),
    discount_total: parseFloat(order.couponDiscount || 0),
    total_tax: parseFloat(order.tax || 0),
    payment_source: order.paymentMethod || "online",
    payment_medium: (order.paymentMethod || "").toLowerCase() === "cod" ? "cod" : "online",
    customer: customerObj,
    product_lines: productLines,
    discount_lines: discountLines,
    meta_data: []
  };

  const deliveryId = crypto.randomUUID();

  // ===== DEBUG LOGGING =====
  console.log("===== NECTOR WEBHOOK ORDER SYNC DEBUG =====");
  console.log("Delivery ID:", deliveryId);
  console.log("Webhook ID:", webhookId);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("===========================================");

  try {
    const response = await axiosPlain.post(
      `https://platform.nector.io/api/open/integrations/customwebsitewebhook/${webhookId}`,
      payload,
      {
        headers: {
          "x-custom-website-topic": "order_updated",
          "x-custom-website-delivery-id": deliveryId,
          "content-type": "application/json"
        }
      }
    );

    await logActivity(user.customer_uuid, "order_sync", payload, response.data, "success");
    console.log("✅ [Nector] Order webhook sync succeeded.");
    return true;
  } catch (err) {
    const errorData = err.response?.data || { message: err.message };
    console.error("❌ [Nector] Order webhook sync failed:", JSON.stringify(errorData, null, 2));
    await logActivity(user.customer_uuid, "order_sync", payload, errorData, "failed");
    return false;
  }
};

/**
 * Create review in Nector via Nector's Create Review API.
 */
exports.createReviewInNector = async (review, user, product, hostHeader = "") => {
  // Format product image URL
  const host = hostHeader || "rabbitnfinch.com";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}/`;
  
  let imageLinks = [];
  if (review.images) {
    let rawImages = review.images;
    if (typeof rawImages === "string") {
      try {
        rawImages = JSON.parse(rawImages);
      } catch (e) {
        rawImages = rawImages.split(",").filter(Boolean);
      }
    }
    if (Array.isArray(rawImages)) {
      imageLinks = rawImages
        .filter(img => typeof img === "string")
        .map(img => img.startsWith("http") ? img : `${baseUrl}${img.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`);
    }
  }

  // Normalize country to 3-letter lower case (default "ind" as per Indian localization)
  let countryCode = "ind";
  if (user.country) {
    const c = user.country.trim().toLowerCase();
    if (c === "india" || c === "in" || c === "ind") {
      countryCode = "ind";
    } else if (c === "usa" || c === "us" || c === "united states") {
      countryCode = "usa";
    } else if (c.length === 3) {
      countryCode = c;
    } else {
      countryCode = c.substring(0, 3);
    }
  }

  // Construct metadetail (avoid empty/too short mobile phone issues by omitting it when invalid)
  const metadetail = {
    email: user.email
  };
  if (user.phone && user.phone.trim().length >= 4 && user.phone.trim().length <= 15) {
    metadetail.mobile = user.phone.trim();
    metadetail.country = countryCode;
  }

  // Optional order_id mapping if available, otherwise attempt to auto-detect a completed order for this customer & product
  let orderId = review.orderId || review.order_id || null;

  if (!orderId) {
    try {
      const Orders = require("../models/orders/order.model");
      const OrderItems = require("../models/orders/orderItems.model");
      const { Op } = require("sequelize");

      // Find all order items matching this productId
      const orderItems = await OrderItems.findAll({
        where: { productId: product.id },
        attributes: ['orderId']
      });
      const orderIds = orderItems.map(item => item.orderId).filter(Boolean);

      if (orderIds.length > 0) {
        const completedOrder = await Orders.findOne({
          where: {
            id: { [Op.in]: orderIds },
            customerId: user.id,
            status: { [Op.in]: ["delivered", "complete"] }
          },
          order: [["createdAt", "DESC"]]
        });
        if (completedOrder) {
          orderId = completedOrder.id;
          console.log(`🔍 [Nector] Auto-detected delivered order ID: ${orderId} for customer ${user.id} and product ${product.id}`);
        }
      }
    } catch (dbErr) {
      console.error("⚠️ [Nector] Failed to auto-detect order for verified purchase badge:", dbErr.message);
    }
  }

  const payload = {
    metadetail,
    reference_product_source: "custom_website",
    reference_product_id: String(product.id),
    name: user.name || "Anonymous Reviewer",
    rating: review.rating,
    description: review.comment || "",
    image_links: imageLinks
  };

  if (orderId) {
    payload.order_id = String(orderId);
  }

  console.log("📡 [Nector] Creating review with payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await axiosInstance.post("/api/v2/merchant/reviews", payload);
    await logActivity(user.customer_uuid, "create_review", payload, response.data, "success");
    console.log(`✅ [Nector] Create review succeeded. Review ID in Nector: ${response.data?.data?.item?._id || "unknown"}`);
    return response.data;
  } catch (err) {
    const errorData = err.response?.data || { message: err.message };
    console.error("❌ [Nector] Create review failed:", JSON.stringify(errorData, null, 2));
    await logActivity(user.customer_uuid, "create_review", payload, errorData, "failed");
    return false;
  }
};

/**
 * Handle incoming webhook notifications from Nector.
 */
exports.handleWebhook = async (req, res) => {
  try {
    const topic = req.headers["x-nector-topic"];
    const secret = req.headers["x-nector-webhook-secret"];

    // Log the webhook payload
    const log = await NectorWebhookLogs.create({
      event_name: topic || "nector_webhook_received",
      payload: req.body,
      processed: false
    });

    // Verify secret signature (supports plaintext or SHA-256 hash of the secret)
    const plainSecret = process.env.NECTOR_WEBHOOK_SECRET || "";
    const hashedSecret = crypto.createHash("sha256").update(plainSecret).digest("hex");
    const isValidSecret = (secret === plainSecret) || (secret === hashedSecret);

    if (!isValidSecret) {
      console.warn("⚠️ Unauthorized Nector webhook attempt with secret:", secret);
      return res.status(401).json({ success: false, message: "Unauthorized webhook request" });
    }

    if (topic === "coupon_update") {
      const data = req.body;
      const code = data.value; // The unique coupon code generated
      const type = data.fiat_class; // 'percent' or 'fixed'
      const value = parseFloat(data.fiat_value || 0);
      const minCartAmount = parseFloat(data.minimumcart_amount || 0);
      const expireAt = data.expire ? new Date(data.expire) : null;
      const status = data.status || "issued";

      if (code) {
        // Upsert the coupon in our system
        await Coupon.upsert({
          code,
          type,
          value,
          minCartAmount,
          expireAt,
          status
        });
        console.log(`✅ [Nector Webhook] Coupon ${code} (${type}: ${value}) processed successfully.`);
      }
    }

    // Mark log as processed
    await log.update({ processed: true });

    return res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (err) {
    console.error("❌ Error in Nector Webhook listener:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Validate a coupon code at checkout.
 */
exports.validateCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    // Support legacy/default signup coupon code
    if (code.toUpperCase() === "FIRST500") {
      return res.json({
        success: true,
        coupon: {
          code: "FIRST500",
          type: "fixed",
          value: 200,
          minCartAmount: 0
        }
      });
    }

    const coupon = await Coupon.findOne({
      where: {
        code,
        status: "issued"
      }
    });

    if (!coupon) {
      return res.status(400).json({ success: false, message: "Invalid or expired coupon code" });
    }

    // Verify expiry date
    if (coupon.expireAt && new Date() > new Date(coupon.expireAt)) {
      return res.status(400).json({ success: false, message: "Coupon code has expired" });
    }

    // Verify minimum cart amount requirement
    if (coupon.minCartAmount && parseFloat(subtotal || 0) < parseFloat(coupon.minCartAmount)) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase of ₹${coupon.minCartAmount} required for this coupon`
      });
    }

    return res.json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: parseFloat(coupon.value),
        minCartAmount: parseFloat(coupon.minCartAmount || 0)
      }
    });
  } catch (err) {
    console.error("❌ Error validating coupon:", err);
    return res.status(500).json({ success: false, message: "Internal server error during coupon validation" });
  }
};

/**
 * Generate Nector Lead Token for the frontend SDK.
 */
exports.getLeadToken = async (req, res) => {
  try {
    let customerUuid = req.user.customer_uuid;
    let customerId = req.user.id;

    if (!customerUuid) {
      const user = await Customers.findByPk(customerId);
      if (user) {
        customerUuid = user.customer_uuid;
      }
    }

    if (!customerUuid) {
      return res.status(400).json({ success: false, message: "Customer UUID not found" });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    // Use the same prefixed ID format as the Nector SDK uses
    const nectorCustomerId = `custom-${customerUuid}`;
    const payloadStr = `${nectorCustomerId}:${timestamp}`;

    const digest = crypto
      .createHmac("sha256", process.env.NECTOR_SIGNING_SECRET || "")
      .update(payloadStr)
      .digest("hex");

    console.log("📡 [Nector] Requesting Lead Token for:", nectorCustomerId);
    const response = await axiosInstance.get("/api/v2/merchant/leads/random-id", {
      params: {
        customer_id: nectorCustomerId
      },
      headers: {
        "x-timestamp": timestamp,
        "x-leaddigest": digest
      }
    });

    await logActivity(customerUuid, "lead_token", { customerUuid, timestamp }, response.data, "success");
    res.json(response.data);
  } catch (err) {
    const errorData = err.response?.data || { message: err.message };
    console.error("❌ [Nector] Lead Token Failed:", JSON.stringify(errorData, null, 2));
    await logActivity(req.user?.customer_uuid || req.user?.id || "unknown", "lead_token", {}, errorData, "failed");
    res.status(err.response?.status || 500).json({
      success: false,
      message: "Failed to generate lead token",
      details: errorData
    });
  }
};

/**
 * Trigger a reward using a specific Trigger ID.
 */
exports.triggerReward = async (user, triggerId) => {
  if (!triggerId) {
    console.error("❌ No triggerId provided to triggerReward.");
    return false;
  }

  // Final customer ID in Nector: prefixed with custom_website-
  const finalCustomerId = `custom_website-custom-${user.customer_uuid}`;

  const payload = {
    trigger_id: triggerId,
    customer_id: finalCustomerId
  };

  console.log("📡 [Nector] Triggering Reward Activity:");
  console.log("- Trigger ID:", triggerId);
  console.log("- Customer ID:", finalCustomerId);

  try {
    const response = await axiosInstance.post("/api/v2/merchant/activities", payload);
    await logActivity(user.customer_uuid, `activity_reward_${triggerId}`, payload, response.data, "success");
    console.log(`✅ [Nector] Reward trigger ${triggerId} succeeded for ${finalCustomerId}`);
    return response.data;
  } catch (err) {
    const errorData = err.response?.data || { message: err.message };
    console.error(`❌ [Nector] Reward trigger ${triggerId} failed:`, JSON.stringify(errorData, null, 2));
    await logActivity(user.customer_uuid, `activity_reward_${triggerId}`, payload, errorData, "failed");
    return false;
  }
};

exports.getSettings = async (req, res) => {
  try {
    const isApiKeySet = !!process.env.NECTOR_API_KEY;
    const isWebhookIdSet = !!process.env.NECTOR_WEBHOOK_ID;
    const isWebhookSecretSet = !!process.env.NECTOR_WEBHOOK_SECRET;
    const isSigningSecretSet = !!process.env.NECTOR_SIGNING_SECRET;

    console.log("🔍 [Debug getSettings] isApiKeySet:", isApiKeySet, "isWebhookIdSet:", isWebhookIdSet, "isWebhookSecretSet:", isWebhookSecretSet);

    return res.json({
      success: true,
      config: {
        configured: isApiKeySet && (isWebhookIdSet || isWebhookSecretSet),
        apiKey: isApiKeySet ? `${process.env.NECTOR_API_KEY.substring(0, 5)}***` : null,
        webhookId: isWebhookIdSet ? `${process.env.NECTOR_WEBHOOK_ID.substring(0, 5)}***` : null,
        platform: process.env.NECTOR_PLATFORM || "custom_website",
        hasSigningSecret: isSigningSecretSet
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await NectorLogs.findAndCountAll({
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching Nector logs:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWebhookLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await NectorWebhookLogs.findAndCountAll({
      where: {
        event_name: {
          [Op.in]: ['coupon_update', 'nector_webhook_received']
        }
      },
      order: [["created_at", "DESC"]],
      limit,
      offset
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching Nector webhook logs:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.manualSyncCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customers.findByPk(id);

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    if (customer.nector_lead_id) {
      return res.json({ success: true, message: "Customer is already synced!" });
    }

    console.log(`📡 Manual Customer Sync triggered for UUID: ${customer.customer_uuid}`);
    const leadId = await exports.syncCustomer(customer, "customer_created");

    if (leadId) {
      await customer.update({ nector_lead_id: leadId });
      return res.json({ success: true, message: "Customer synced successfully with Nector", leadId });
    } else {
      return res.status(500).json({ success: false, message: "Failed to sync customer with Nector. Check backend logs." });
    }
  } catch (error) {
    console.error("Error in manualSyncCustomer:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.manualSyncOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const Orders = require("../models/orders/order.model");
    const order = await Orders.findByPk(id);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.nector_synced) {
      return res.json({ success: true, message: "Order is already synced!" });
    }

    const customer = await Customers.findByPk(order.customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer linked to order not found" });
    }

    console.log(`📡 Manual Order Sync triggered for Order ID: ${order.id}`);
    const success = await exports.syncOrder(order, customer);

    if (success) {
      await order.update({ nector_synced: true });
      return res.json({ success: true, message: "Order synced successfully with Nector" });
    } else {
      return res.status(500).json({ success: false, message: "Failed to sync order with Nector. Check backend logs." });
    }
  } catch (error) {
    console.error("Error in manualSyncOrder:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCoupons = async (req, res) => {
  try {
    const Orders = require("../models/orders/order.model");
    const Customers = require("../models/customer/customers.model");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Coupon.findAndCountAll({
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    // Find all coupon codes used in any orders
    const allUsedCouponCodes = await Orders.findAll({
      attributes: ["couponCode"],
      where: {
        couponCode: {
          [Op.ne]: null
        }
      },
      raw: true
    }).then(orders => orders.map(o => o.couponCode).filter(Boolean));

    // Fetch metrics
    const totalCount = await Coupon.count();
    
    const activeCount = await Coupon.count({
      where: {
        status: "issued",
        code: {
          [Op.notIn]: allUsedCouponCodes.length > 0 ? allUsedCouponCodes : ["__DUMMY__"]
        },
        [Op.or]: [
          { expireAt: null },
          { expireAt: { [Op.gt]: new Date() } }
        ]
      }
    });

    const expiredCount = await Coupon.count({
      where: {
        status: "issued",
        code: {
          [Op.notIn]: allUsedCouponCodes.length > 0 ? allUsedCouponCodes : ["__DUMMY__"]
        },
        expireAt: { [Op.lt]: new Date() }
      }
    });

    const usedCount = await Coupon.count({
      where: {
        [Op.or]: [
          {
            status: {
              [Op.in]: ["used", "redeemed", "complete"]
            }
          },
          {
            code: {
              [Op.in]: allUsedCouponCodes
            }
          }
        ]
      }
    });

    // Fetch the recent webhook logs to find matches for customer emails/IDs.
    const webhookLogs = await NectorWebhookLogs.findAll({
      where: {
        event_name: "coupon_update"
      },
      order: [["created_at", "DESC"]],
      limit: 100
    });

    const couponsWithCustomer = await Promise.all(rows.map(async (coupon) => {
      const couponData = coupon.toJSON();
      
      // Look up matching order
      const matchingOrder = await Orders.findOne({
        where: {
          couponCode: coupon.code
        },
        attributes: ["id", "status", "finalAmount", "createdAt"],
        raw: true
      });

      if (matchingOrder) {
        couponData.status = "used";
        couponData.order = {
          id: matchingOrder.id,
          status: matchingOrder.status,
          finalAmount: parseFloat(matchingOrder.finalAmount || 0),
          createdAt: matchingOrder.createdAt
        };
      } else {
        couponData.order = null;
      }
      
      const matchingLog = webhookLogs.find(
        (log) => log.payload && String(log.payload.value).trim().toLowerCase() === String(coupon.code).trim().toLowerCase()
      );
      
      if (matchingLog && matchingLog.payload && matchingLog.payload.customer) {
        const payloadCustomer = { ...matchingLog.payload.customer };
        
        // Find local customer by email or customer_uuid
        const uuidToFind = payloadCustomer.id ? payloadCustomer.id.replace(/^custom-/, "") : null;
        const whereClause = {};
        if (uuidToFind) {
          whereClause.customer_uuid = uuidToFind;
        } else if (payloadCustomer.email) {
          whereClause.email = payloadCustomer.email;
        }

        if (Object.keys(whereClause).length > 0) {
          const localCustomer = await Customers.findOne({
            where: whereClause,
            attributes: ["phone", "country", "nector_lead_id"],
            raw: true
          });
          if (localCustomer) {
            payloadCustomer.mobile = localCustomer.phone || "";
            payloadCustomer.country = localCustomer.country || "";
            payloadCustomer.nector_lead_id = localCustomer.nector_lead_id || "";
          } else {
            payloadCustomer.mobile = "";
            payloadCustomer.country = "";
            payloadCustomer.nector_lead_id = payloadCustomer.id || "";
          }
        } else {
          payloadCustomer.mobile = "";
          payloadCustomer.country = "";
          payloadCustomer.nector_lead_id = payloadCustomer.id || "";
        }
        
        couponData.customer = payloadCustomer;
      } else {
        couponData.customer = null;
      }
      
      return couponData;
    }));

    return res.json({
      success: true,
      data: couponsWithCustomer,
      metrics: {
        total: totalCount,
        active: activeCount,
        expired: expiredCount,
        used: usedCount
      },
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


