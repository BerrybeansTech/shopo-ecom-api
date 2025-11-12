const Support = require("../models/support/support.model");
const { Op } = require("sequelize");

const getAllSupports = async (req, res) => {
  try {
    const { email, status, type, q } = req.query;

    const whereClause = {};

    if (email && typeof email === 'string' && email.trim()) {
      whereClause.email = { [Op.iLike]: `%${email.trim()}%` };
    }
    if (status && typeof status === 'string' && status.trim()) {
      whereClause.status = status.trim();
    }
    if (type && typeof type === 'string' && type.trim()) {
      whereClause.type = type.trim();
    }
    if (q && typeof q === 'string' && q.trim()) {
      whereClause[Op.or] = [
        { email: { [Op.iLike]: `%${q.trim()}%` } },
        { phone: { [Op.iLike]: `%${q.trim()}%` } },
        { message: { [Op.iLike]: `%${q.trim()}%` } },
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters",
      });
    }
    const offset = (page - 1) * limit;

    const { count, rows } = await Support.findAndCountAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    res.status(200).json({
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
    console.error("Get All Supports Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching support requests",
    });
  }
};

const getSupportById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support ticket ID format",
      });
    }

    const ticket = await Support.findByPk(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error("Get Support By Id Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching support ticket",
    });
  }
};

const createSupport = async (req, res) => {
  try {
    const { email, phone, type, message } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required",
      });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required and must be a non-empty string",
      });
    }

    // Optional: Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const newSupport = await Support.create({
      email: email.trim(),
      phone: phone && typeof phone === 'string' ? phone.trim() : null,
      type: type && typeof type === 'string' ? type.trim() : null,
      message: message.trim(),
    });

    res.status(201).json({
      success: true,
      message: "Support request created successfully",
      data: newSupport,
    });
  } catch (error) {
    console.error("Create Support Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while creating support request",
    });
  }
};

const updateSupport = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, message, status } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support ticket ID format",
      });
    }

    const existing = await Support.findByPk(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }

    const updateData = {};
    if (email !== undefined) {
      if (typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
          success: false,
          message: "Email must be a non-empty string if provided",
        });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
      }
      updateData.email = email.trim();
    }
    if (phone !== undefined) {
      if (typeof phone !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Phone must be a string if provided",
        });
      }
      updateData.phone = phone.trim() || null;
    }
    if (message !== undefined) {
      if (typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Message must be a string if provided",
        });
      }
      updateData.message = message.trim() || null;
    }
    if (status !== undefined) {
      if (typeof status !== 'string' || !status.trim()) {
        return res.status(400).json({
          success: false,
          message: "Status must be a non-empty string if provided",
        });
      }
      updateData.status = status.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    await existing.update(updateData);

    const updatedSupport = await Support.findByPk(id);
    res.status(200).json({
      success: true,
      message: "Support ticket updated successfully",
      data: updatedSupport,
    });
  } catch (error) {
    console.error("Update Support Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while updating support ticket",
    });
  }
};

const deleteSupport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid support ticket ID format",
      });
    }

    const existing = await Support.findByPk(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Support ticket not found",
      });
    }



    await Support.destroy({ where: { id } });

    res.status(200).json({
      success: true,
      message: "Support ticket deleted successfully",
    });
  } catch (error) {
    console.error("Delete Support Error:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: "Cannot delete support ticket due to related records",
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while deleting support ticket",
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