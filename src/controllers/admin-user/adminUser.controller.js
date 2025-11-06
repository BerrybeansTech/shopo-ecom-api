const AdminUser = require("../../models/adminUser/AdminUser.model");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const sequelize = require("../../config/db");
const redisClient = require("../../config/redis.config");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../services/jwt.service");
// const { OAuth2Client } = require("google-auth-library");
// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);




const createAdminUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password
    } = req.body;

    if (!password || password.trim() === "") {
      return res
        .status(400)
        .json({ success: false, message: "Password is required" });
    }

    const newAdmin = await sequelize.transaction(async (transaction) => {
      const existingUser = await AdminUser.findOne({ where: { email }, transaction });
      if (existingUser) {
        throw new Error("Email already registered");
      }

      const existingPhone = await AdminUser.findOne({ where: { phone }, transaction });
      if (existingPhone) {
        throw new Error("Phone number already registered");
      }


      const resetKey = `reset:customer-registration:${email}`;
      await redisClient.del(resetKey);

      const hashedPassword = await bcrypt.hash(password, 10);

      const adminUser = await AdminUser.create(
        {
      name,
      email,
      phone,
      password: hashedPassword
        },
        { transaction }
      );

      return adminUser;
    });

    const payload = {
      id: newAdmin.id,
      name: newAdmin.name,
      email: newAdmin.email,
      phone: newAdmin.phone,
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
      message: "Admin user created successfully",
      data: { adminUser: newAdmin, accessToken },
    });
  } catch (error) {
    console.error("Error creating Admin user:", error);

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
      message: "Failed to admin user",
      error: error.message,
    });
  }
};


const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    // Find by email or phone
    const user = await AdminUser.findOne({
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
module.exports = {
  createAdminUser,
  adminLogin,
};
