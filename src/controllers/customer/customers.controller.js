const Customers = require("../../models/customer/customers.model");
const Cart = require("../../models/customer/cart.model");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const sequelize = require("../../config/db");
const redisClient = require("../../config/redis.config");
const { validateOtpToken } = require("../../services/otp.service");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../services/jwt.service");
// const { OAuth2Client } = require("google-auth-library");
// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getAllCustomers = async (req, res) => {
  try {
    const { name, state, status, email, allCustomers } = req.query;

    const whereClause = {};

    if (allCustomers) {
      const result = await Customers.findAndCountAll({
        attributes: ["id", "name"],
      });
      return res.json(result);
    }

    if (name) whereClause.name = { [Op.like]: `%${name}%` };
    if (email) whereClause.email = { [Op.like]: `%${email}%` };
    if (status) whereClause.status = status;
    if (state) whereClause.state = state;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Customers.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.json({
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
    console.error("Error fetching customers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve customers",
    });
  }
};

const getCustomersById = async (req, res) => {
  const { id } = req.params;

  try {
    const customer = await Customers.findOne({ where: { id } });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    console.error("Error fetching customer by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve customer by ID",
    });
  }
};

const createCustomers = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      otpToken,
      name,
      email,
      phone,
      password,
      address,
      city,
      state,
      country,
      postalCode,
    } = req.body;

    if (!password || password.trim() === "") {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Password is required" });
    }

    const existingUser = await Customers.findOne({
      where: { email },
      transaction,
    });
    if (existingUser) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const existingPhone = await Customers.findOne({
      where: { phone },
      transaction,
    });
    if (existingPhone) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Phone number already registered" });
    }

    const validation = await validateOtpToken({
      type: "customer-registration",
      identifier: phone,
      token: otpToken,
    });

    if (!validation.success) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    const resetKey = `reset:customer-registration:${email}`;
    await redisClient.del(resetKey);

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = await Customers.create(
      {
        name,
        email,
        phone,
        password: hashedPassword,
        address,
        city,
        state,
        country,
        postalCode,
      },
      { transaction }
    );

    await Cart.create(
      {
        customerId: customer.id,
        isActive: true,
      },
      { transaction }
    );

    await transaction.commit();

    const payload = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "Strict",
      maxAge: parseInt(process.env.COOKIE_MAX_AGE || 7 * 24 * 60 * 60 * 1000),
    });

    return res.json({
      success: true,
      message: "Customer registered successfully",
      data: { customer, accessToken },
    });
  } catch (error) {
    if (transaction) await transaction.rollback();

    console.error("Error creating customer:", error);

    if (
      error.message === "Email already registered" ||
      error.message === "Phone number already registered"
    ) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors[0]?.path;
      return res.status(400).json({
        success: false,
        message: `This ${field} is already registered`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message,
    });
  }
};

const customerLogin = async (req, res) => {
  const { email, phone, password } = req.body;

  try {
    if ((!email && !phone) || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    // Find by email or phone
    const user = await Customers.findOne({
      where: email ? { email } : { phone },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(401)
        .json({ message: "Invalid email/phone or password" });

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "Strict",
      maxAge: parseInt(process.env.COOKIE_MAX_AGE || 7 * 24 * 60 * 60 * 1000),
    });

    res.json({
      success: true,
      message: "Login successful",
      accessToken,
      user,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, phone, newPassword, otpToken } = req.body;

    // Check that at least one identifier is provided
    if (!email && !phone) {
      return res
        .status(400)
        .json({ success: false, message: "Email or phone number is required" });
    }

    // Find user by email or phone
    const whereClause = {};
    if (email && email.trim() !== "") whereClause.email = email.trim();
    else if (phone && phone.trim() !== "") whereClause.phone = phone.trim();

    const user = await Customers.findOne({ where: whereClause });
    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message: "User not found with this email or phone",
        });
    }

    // Validate OTP for the correct identifier
    const identifier = email || phone;
    const validation = await validateOtpToken({
      type: "reset-password",
      identifier,
      token: otpToken,
    });

    if (!validation.success) {
      return res.status(403).json(validation);
    }

    // Hash and update the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Customers.update(
      { password: hashedPassword },
      { where: whereClause }
    );

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateCustomers = async (req, res) => {
  try {
    const {
      id,
      name,
      email,
      phone,
      address,
      city,
      state,
      country,
      status,
      postalCode,
    } = req.body;

    const existing = await Customers.findByPk(id);
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    await Customers.update(
      { name, email, phone, address, city, state, country, status, postalCode },
      { where: { id } }
    );

    res.json({ success: true, message: "Customer updated successfully" });
  } catch (error) {
    console.error("Error updating customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
};

const deleteCustomers = async (req, res) => {
  const { id } = req.params;

  try {
    const customer = await Customers.findOne({ where: { id } });

    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    await Customers.destroy({ where: { id } });

    res.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete customer",
    });
  }
};

const checkUserExists = async (req, res) => {
  try {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide email or phone number as query parameter",
      });
    }

    const whereClause = [];

    if (email) {
      whereClause.push({ email });
    }

    if (phone) {
      whereClause.push({ phone });
    }

    const existingUser = await Customers.findOne({
      where: {
        [Op.or]: whereClause,
      },
      attributes: ["id"],
    });

    res.json({
      success: true,
      isExists: !!existingUser,
    });
  } catch (error) {
    console.error("Error checking user existence:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check user existence",
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomersById,
  createCustomers,
  customerLogin,
  resetPassword,
  updateCustomers,
  deleteCustomers,
  checkUserExists,
};
