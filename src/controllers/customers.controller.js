const Customers = require("../models/customers.model");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const { Op, literal } = require("sequelize");
const { validateOtpToken } = require("../services/otp.service")
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../services/jwt.service");

const getAllCustomers = async (req, res) => {
  try {
    const { name, state, type, status, email, allCustomers } = req.query;

    const whereClause = {};
    const andConditions = [];

    if (allCustomers) {
      const result = await Customers.findAndCountAll({
        attributes: ["id", "name"],
      });
      return res.json(result);
    }
    if (name) {
      whereClause.name = {
        [Op.like]: `%${name}%`,
      };
    }

    if (email) {
      whereClause.email = {
        [Op.like]: `%${email}%`,
      };
    }

    if (status) whereClause.status = status;
    if (type) whereClause.type = type;
    if (state) whereClause.state = state;

    if (andConditions.length > 0) {
      whereClause[Op.and] = andConditions;
    }

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
    const t = await Customers.findOne({ where: { id } });

    if (!t) {
      return res
        .status(404)
        .json({ success: false, message: "Customers not found" });
    }

    res.json({ success: true, data: { ...t.toJSON() } });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve Customers by id",
    });
  }
};

const createCustomers = async (req, res) => {
  const {
    otpToken,
    userName,
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

  try {
    if (!password || password.trim() === "") {
      return res
        .status(401)
        .json({ success: false, message: "Missing password" });
    }

    const validation = await validateOtpToken({
      type: "customer-registration",
      identifier: email,
      token: otpToken,
    });

    if (!validation.success) {
      return res.status(403).json(validation);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newCustomer = await Customers.create({
      userName,
      name,
      email,
      phone,
      password: hashedPassword,
      address,
      city,
      state,
      country,
      postalCode,
    });

    // Tokens
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
      maxAge: process.env.COOKIE_MAX_AGE,
    });

    res.json({
      success: true,
      message: "Customer created successfully",
      data: {
        customer: newCustomer,
        accessToken,
      },
    });
  } catch (error) {
    console.error("Error creating customer:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create customer" });
  }
};

const customerLogin = async (req, res) => {
  const { email, password, credential: googleToken } = req.body;

  try {
    let user;

    if (googleToken) {
      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { email, name, sub: googleId } = payload;

      user = await Customers.findOne({ where: { email } });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
        // user = await Customers.create({
        //   email,
        //   full_name: name,
        //   google_id: googleId,
        //   type: 'google',
        // });
      }
    } else if (email && password) {
      user = await Customers.findOne({ where: { email: email } });

      if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(401).json({ message: "Invalid password" });
    } else {
      return res.status(400).json({ message: "Missing credentials" });
    }
    const payload = {
      id: user?.id,
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // const isMobile = req.headers["platform"] === "mobile";
    // if (!isMobile) {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "Strict",
      maxAge: process.env.COOKIE_MAX_AGE,
    });
    // }
    return res.json({
      success: true,
      message: "Login successful",
      accessToken,
      user
    });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword, otpToken } = req.body;

    const user = await Customers.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email',
      });
    }

    const validation = await validateOtpToken({
      type: 'reset-password',
      identifier: email,
      token: otpToken,
    });

    if (!validation.success) {
      return res.status(403).json(validation);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Customers.update({ password: hashedPassword }, { where: { email } });

    return res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const updateCustomers = async (req, res) => {
  let {
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

  try {
    const existing = await Customers.findByPk(id);

    if (!existing) {
      return res.status(404).json({ message: "Customer not found" });
    }

    await Customers.update(
      {
        name,
        email,
        phone,
        address,
        city,
        state,
        country,
        status,
        postalCode
      },
      { where: { id } }
    );

    res.json({ success: true, message: "Customer updated successfully" });
  } catch (error) {
    console.error("Error updating customer:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update customer" });
  }
};

const deleteCustomers = async (req, res) => {
  const { id } = req.params;

  try {
    const CustomersData = await Customers.findOne({ where: { id } });

    if (!CustomersData) {
      return res
        .status(404)
        .json({ success: false, message: "Customers not found" });
    }

    await Customers.destroy({ where: { id } });

    res.json({
      success: true,
      message: "Customers deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Customers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete Customers",
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
};
