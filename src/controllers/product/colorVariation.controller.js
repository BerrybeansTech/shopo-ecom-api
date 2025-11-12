const productColorVariation = require("../../models/product/product-colorVariation.model");

exports.createColorVariation = async (req, res) => {
  try {
    const { color } = req.body;
    if (!color || typeof color !== 'string' || !color.trim()) {
      return res.status(400).json({ success: false, message: "Color is required and must be a non-empty string" });
    }

    const newColor = await productColorVariation.create({ color: color.trim() });
    res.status(201).json({ success: true, message: "Color variation created successfully", data: newColor });
  } catch (error) {
    console.error("Create Color Variation Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while creating color variation" });
  }
};

exports.getAllColorVariations = async (req, res) => {
  try {
    const colors = await productColorVariation.findAll({
      order: [["id", "ASC"]],
    });
    res.status(200).json({ success: true, data: colors });
  } catch (error) {
    console.error("Get All Color Variations Error:", error);
    res.status(500).json({ success: false, message: "Internal server error occurred while fetching color variations" });
  }
};

exports.getColorVariationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid color variation ID format" });
    }

    const color = await productColorVariation.findByPk(id);
    if (!color) {
      return res.status(404).json({ success: false, message: "Color variation not found" });
    }

    res.status(200).json({ success: true, data: color });
  } catch (error) {
    console.error("Get Color Variation By Id Error:", error);
    res.status(500).json({ success: false, message: "Internal server error occurred while fetching color variation" });
  }
};

exports.updateColorVariation = async (req, res) => {
  try {
    const { id } = req.params;
    const { color } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid color variation ID format" });
    }

    const existing = await productColorVariation.findByPk(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Color variation not found" });
    }

    if (color !== undefined) {
      if (typeof color !== 'string' || !color.trim()) {
        return res.status(400).json({ success: false, message: "Color must be a non-empty string if provided" });
      }
      existing.color = color.trim();
    }

    await existing.save();

    const updatedColor = await productColorVariation.findByPk(id);
    res.status(200).json({ success: true, message: "Color variation updated successfully", data: updatedColor });
  } catch (error) {
    console.error("Update Color Variation Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while updating color variation" });
  }
};

exports.deleteColorVariation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid color variation ID format" });
    }

    const existing = await productColorVariation.findByPk(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Color variation not found" });
    }

   

    await existing.destroy();
    res.status(200).json({ success: true, message: "Color variation deleted successfully" });
  } catch (error) {
    console.error("Delete Color Variation Error:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ success: false, message: "Cannot delete color variation due to related products" });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while deleting color variation" });
  }
};