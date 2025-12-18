const ProductOccasion = require("../../models/product/product-Occasion.model");
const Product = require("../../models/product/product.model");
const { Op } = require('sequelize');

exports.createOccasion = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: "Occasion name is required and must be a non-empty string" });
    }

    const newOccasion = await ProductOccasion.create({ name: name.trim() });
    res.status(201).json({ success: true, message: "Occasion created successfully", data: newOccasion });
  } catch (error) {
    console.error("Create Occasion Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while creating occasion" });
  }
};

exports.getAllOccasions = async (req, res) => {
  try {
    const { name, page = 1, limit = 10, sortBy = "newest", ids, all, material } = req.query;

    const where = {};
    if (name && name.trim()) {
      where.name = { [Op.iLike]: `%${name.trim()}%` };
    }

    // Support ids comma-separated for multi-select (e.g. ids=1,2,3)
    if (ids && typeof ids === 'string') {
      const idArray = ids
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => Number(v))
        .filter((n) => !Number.isNaN(n));
      if (idArray.length) where.id = { [Op.in]: idArray };
    }

    const include = [];
    if (material) {
      const materialIds = material.split(',').map(id => Number(id.trim())).filter(n => !Number.isNaN(n));
      if (materialIds.length > 0) {
        // Find occasions that have products with the given material IDs
        include.push({
          model: Product,
          as: 'products', // Required alias from relationship.js
          attributes: [], // We don't need product data, just the filtering
          where: {
            productMaterialId: { [Op.in]: materialIds }
          },
          required: true // Inner join to ensure we only get occasions with matching products
        });
      }
    }

    const order = [];
    if (sortBy === "asc") order.push(["name", "ASC"]);
    else if (sortBy === "desc") order.push(["name", "DESC"]);
    else if (sortBy === "oldest") order.push(["createdAt", "ASC"]);
    else order.push(["createdAt", "DESC"]);

    // If caller requests all (for a UI multi-select), return full list without pagination
    if (String(all).toLowerCase() === 'true') {
      const rows = await ProductOccasion.findAll({
        where,
        order,
        include,
        distinct: true // Ensure unique occasions are returned
      });
      return res.status(200).json({ success: true, data: rows });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await ProductOccasion.findAndCountAll({
      where,
      order,
      limit: parseInt(limit),
      offset,
      include,
      distinct: true // distinct count of occasions
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
    console.error("Get All Occasions Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch occasions" });
  }
};

exports.getOccasionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid occasion ID format" });
    }

    const occasion = await ProductOccasion.findByPk(id);
    if (!occasion) {
      return res.status(404).json({ success: false, message: "Occasion not found" });
    }
    res.status(200).json({ success: true, data: occasion });
  } catch (error) {
    console.error("Get Occasion By Id Error:", error);
    res.status(500).json({ success: false, message: "Internal server error occurred while fetching occasion" });
  }
};

exports.updateOccasion = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid occasion ID format" });
    }

    const occasion = await ProductOccasion.findByPk(id);
    if (!occasion) {
      return res.status(404).json({ success: false, message: "Occasion not found" });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: "Occasion name must be a non-empty string if provided" });
      }
      occasion.name = name.trim();
    }

    await occasion.save();

    // Reload to ensure fresh data
    const updatedOccasion = await ProductOccasion.findByPk(id);
    res.status(200).json({ success: true, message: "Occasion updated successfully", data: updatedOccasion });
  } catch (error) {
    console.error("Update Occasion Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while updating occasion" });
  }
};

exports.deleteOccasion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid occasion ID format" });
    }

    const occasion = await ProductOccasion.findByPk(id);
    if (!occasion) {
      return res.status(404).json({ success: false, message: "Occasion not found" });
    }



    await occasion.destroy();
    res.status(200).json({ success: true, message: "Occasion deleted successfully" });
  } catch (error) {
    console.error("Delete Occasion Error:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ success: false, message: "Cannot delete occasion due to related products" });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while deleting occasion" });
  }
};