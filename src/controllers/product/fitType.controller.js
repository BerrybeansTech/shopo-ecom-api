const ProductFitType = require("../../models/product/product-fitType.model");

exports.createFitType = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: "Fit type name is required and must be a non-empty string" });
    }

    const fitType = await ProductFitType.create({ name: name.trim() });
    res.status(201).json({ success: true, message: "Fit type created successfully", data: fitType });
  } catch (error) {
    console.error("Create Fit Type Error:", error);
    // Handle Sequelize validation errors specifically
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while creating fit type" });
  }
};

exports.getAllFitTypes = async (req, res) => {
  try {
    const { name, page = 1, limit = 10, sortBy = "newest" } = req.query;

    const where = {};
    if (name && name.trim()) {
      where.name = { [Op.iLike]: `%${name.trim()}%` };
    }

    const order = [];
    if (sortBy === "asc") order.push(["name", "ASC"]);
    else if (sortBy === "desc") order.push(["name", "DESC"]);
    else if (sortBy === "oldest") order.push(["createdAt", "ASC"]);
    else order.push(["createdAt", "DESC"]);

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await ProductFitType.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset,
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error("Get All Fit Types Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch fit types" });
  }
};

exports.getFitTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid fit type ID format" });
    }

    const fitType = await ProductFitType.findByPk(id);
    if (!fitType) {
      return res.status(404).json({ success: false, message: "Fit type not found" });
    }
    res.status(200).json({ success: true, data: fitType });
  } catch (error) {
    console.error("Get Fit Type By Id Error:", error);
    res.status(500).json({ success: false, message: "Internal server error occurred while fetching fit type" });
  }
};

exports.updateFitType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid fit type ID format" });
    }

    const fitType = await ProductFitType.findByPk(id);
    if (!fitType) {
      return res.status(404).json({ success: false, message: "Fit type not found" });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: "Fit type name must be a non-empty string if provided" });
      }
      fitType.name = name.trim();
    }

    await fitType.save();

    res.status(200).json({ success: true, message: "Fit type updated successfully", data: fitType });
  } catch (error) {
    console.error("Update Fit Type Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while updating fit type" });
  }
};

exports.deleteFitType = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid fit type ID format" });
    }

    const fitType = await ProductFitType.findByPk(id);
    if (!fitType) {
      return res.status(404).json({ success: false, message: "Fit type not found" });
    }

    await fitType.destroy();
    res.status(200).json({ success: true, message: "Fit type deleted successfully" });
  } catch (error) {
    console.error("Delete Fit Type Error:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ success: false, message: "Cannot delete fit type due to related records" });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while deleting fit type" });
  }
};
