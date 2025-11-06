const Customers = require("../models/customer/customers.model");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const sequelize = require("../config/db");
const redisClient = require("../config/redis.config");
const { validateOtpToken } = require("../services/otp.service");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../services/jwt.service");
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
      return res
        .status(400)
        .json({ success: false, message: "Password is required" });
    }

    const validation = await validateOtpToken({
      type: "customer-registration",
      identifier: phone,
      token: otpToken,
    });

    if (!validation.success) {
      return res.status(403).json(validation);
    }


    const resetKey = `reset:customer-registration:${email}`;
    await redisClient.del(resetKey);

  
    const hashedPassword = await bcrypt.hash(password, 10);

   
    const newCustomer = await sequelize.transaction(async (transaction) => {
    
      const existingUser = await Customers.findOne({ where: { email }, transaction });
      if (existingUser) {
        throw new Error("Email already registered");
      }

 
      const existingPhone = await Customers.findOne({ where: { phone }, transaction });
      if (existingPhone) {
        throw new Error("Phone number already registered");
      }

  
      return await Customers.create({
        name,
        email,
        phone,
        password: hashedPassword,
        address,
        city,
        state,
        country,
        postalCode,
      }, { transaction });
    });

    const payload = {
      id: newCustomer.id,
      name: newCustomer.name,
      email: newCustomer.email,
      phone: newCustomer.phone,
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
      message: "Customer registered successfully",
      data: { customer: newCustomer, accessToken },
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);


    if (error.message === "Email already registered" || error.message === "Phone number already registered") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors[0]?.path;
      return res.status(400).json({
        success: false,
        message: `This ${field} is already registered`
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message
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
      return res.status(401).json({ message: "Invalid email/phone or password" });

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
    const { email, newPassword, otpToken } = req.body;

    const user = await Customers.findOne({ where: { email } });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found with this email" });
    }

    const validation = await validateOtpToken({
      type: "reset-password",
      identifier: email,
      token: otpToken,
    });

    if (!validation.success) {
      return res.status(403).json(validation);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Customers.update({ password: hashedPassword }, { where: { email } });

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
      return res.status(404).json({ success: false, message: "Customer not found" });
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
        message: "Please provide email or phone number as query parameter"
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
        [Op.or]: whereClause
      },
      attributes: ['id']
    });

    res.json({
      success: true,
      isExists: !!existingUser
    });
    
  } catch (error) {
    console.error("Error checking user existence:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check user existence"
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
