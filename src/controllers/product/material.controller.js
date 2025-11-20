const ProductMaterial = require("../../models/product/product-material.model");

exports.createMaterial = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: "Material name is required and must be a non-empty string" });
    }

    const newMaterial = await ProductMaterial.create({ name: name.trim() });
    res.status(201).json({ success: true, message: "Material created successfully", data: newMaterial });
  } catch (error) {
    console.error("Create Material Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while creating material" });
  }
};

exports.getAllMaterials = async (req, res) => {
  try {
    const { name, page = 1, limit = 10, sortBy = "newest" } = req.query;

    const where = {};
    if (name && name.trim()) {
      where.name = { [Op.iLike]: `%${name.trim()}%` }; // PostgreSQL
      // where.name = { [Op.like]: `%${name.trim()}%` }; // MySQL
    }

    const order = [];
    if (sortBy === "asc") order.push(["name", "ASC"]);
    else if (sortBy === "desc") order.push(["name", "DESC"]);
    else if (sortBy === "oldest") order.push(["createdAt", "ASC"]);
    else order.push(["createdAt", "DESC"]); // newest (default)

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await ProductMaterial.findAndCountAll({
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
    console.error("Get All Materials Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch materials" });
  }
};

exports.getMaterialById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid material ID format" });
    }

    const material = await ProductMaterial.findByPk(id);
    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }
    res.status(200).json({ success: true, data: material });
  } catch (error) {
    console.error("Get Material By Id Error:", error);
    res.status(500).json({ success: false, message: "Internal server error occurred while fetching material" });
  }
};

exports.updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid material ID format" });
    }

    const material = await ProductMaterial.findByPk(id);
    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: "Material name must be a non-empty string if provided" });
      }
      material.name = name.trim();
    }

    await material.save();

    // Reload to ensure fresh data
    const updatedMaterial = await ProductMaterial.findByPk(id);
    res.status(200).json({ success: true, message: "Material updated successfully", data: updatedMaterial });
  } catch (error) {
    console.error("Update Material Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while updating material" });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid material ID format" });
    }

    const material = await ProductMaterial.findByPk(id);
    if (!material) {
      return res.status(404).json({ success: false, message: "Material not found" });
    }

 

    await material.destroy();
    res.status(200).json({ success: true, message: "Material deleted successfully" });
  } catch (error) {
    console.error("Delete Material Error:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ success: false, message: "Cannot delete material due to related products" });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while deleting material" });
  }
};