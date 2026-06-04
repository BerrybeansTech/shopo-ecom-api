const axiosInstance = require("../services/nector.service");
const axiosPlain = require("axios");
const NectorLogs = require("../models/nector/nectorLogs.model");
const NectorWebhookLogs = require("../models/nector/nectorWebhookLogs.model");
const Customers = require("../models/customer/customers.model");
const Coupon = require("../models/offers/coupon.model");
const OrderItems = require("../models/orders/orderItems.model");
const crypto = require("crypto");

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

  // Per Nector docs: webhook payload id should be the raw customer ID "without any integration prefix".
  // Nector internally stores them and the SDK prepends "custom-" when querying.
  const payload = {
    id: user.customer_uuid,
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
    console.log(`✅ [Nector] Customer webhook sync (${topic}) succeeded. Nector ID: ${user.customer_uuid}`);
    return user.customer_uuid;
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

  // Per Nector docs: customer id in order payload should also be the raw ID (no prefix)
  const customerObj = {
    id: user.customer_uuid,
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

    // Verify secret signature
    if (secret !== process.env.NECTOR_WEBHOOK_SECRET) {
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
