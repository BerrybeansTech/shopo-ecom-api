const Support = require("../models/support.model");
const { Op } = require("sequelize");


const getAllSupports = async (req, res) => {
  try {
    const { email, status, type, q } = req.query;

    const whereClause = {};

    if (email) whereClause.email = { [Op.like]: `%${email}%` };
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;
    if (q) {
      whereClause[Op.or] = [
        { email: { [Op.like]: `%${q}%` } },
        { phone: { [Op.like]: `%${q}%` } },
        { message: { [Op.like]: `%${q}%` } },
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Support.findAndCountAll({
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
    console.error("Error fetching supports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve support requests",
    });
  }
};

const getSupportById = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Support.findByPk(id);

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Support ticket not found" });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error("Error fetching support:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve support ticket",
    });
  }
};

const createSupport = async (req, res) => {
  try {
    const { email, phone, type, message } = req.body;

    if (!email || !message) {
      return res.status(400).json({
        success: false,
        message: "Email and message are required",
      });
    }

    const newSupport = await Support.create({
      email,
      phone,
      type,
      message,
    });

    res.status(201).json({
      success: true,
      message: "Support request created successfully",
      data: newSupport,
    });
  } catch (error) {
    console.error("Error creating support:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create support request",
    });
  }
};

const updateSupport = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, message, status } = req.body;

    const existing = await Support.findByPk(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Support not found" });
    }

    await Support.update(
      { email, phone, message, status },
      { where: { id } }
    );

    res.json({
      success: true,
      message: "Support ticket updated successfully",
    });
  } catch (error) {
    console.error("Error updating support:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update support ticket",
    });
  }
};

const deleteSupport = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await Support.findByPk(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Support not found" });
    }

    await Support.destroy({ where: { id } });

    res.json({
      success: true,
      message: "Support ticket deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting support:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete support ticket",
    });
  }
};

module.exports = {
  createSupport,
  getAllSupports,
  getSupportById,
  updateSupport,
  deleteSupport,
};
