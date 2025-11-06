// src/controllers/sizeVariation/sizeVariation.controller.js
const productSizeVariation = require("../../models/product/product-sizeVariation.model");

exports.createSizeVariation = async (req, res) => {
  try {
    let { type, size } = req.body;

    if (!type || !size)
      return res.status(400).json({ message: "Type and size are required" });

    // Convert single size string into array for consistency
    if (typeof size === "string") {
      size = [size];
    }

    const newSize = await productSizeVariation.create({ type, size });

    res.status(201).json({
      success: true,
      message: "Size variation created successfully",
      data: newSize,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating size variation",
      error: error.message,
    });
  }
};

exports.getAllSizeVariations = async (req, res) => {
  try {
    const { type } = req.query;
    const where = type ? { where: { type } } : {};
    const sizes = await productSizeVariation.findAll(where);
    res.status(200).json({ success: true, data: sizes });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching size variations",
      error: error.message,
    });
  }
};

exports.getSizeVariationById = async (req, res) => {
  try {
    const size = await productSizeVariation.findByPk(req.params.id);
    if (!size) return res.status(404).json({ message: "Size variation not found" });
    res.status(200).json({ success: true, data: size });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching size variation",
      error: error.message,
    });
  }
};

exports.updateSizeVariation = async (req, res) => {
  try {
    const { type, size } = req.body;
    const existing = await productSizeVariation.findByPk(req.params.id);

    if (!existing) return res.status(404).json({ message: "Size variation not found" });

    existing.type = type || existing.type;

    if (size) {
      existing.size = typeof size === "string" ? [size] : size;
    }

    await existing.save();

    res.status(200).json({
      success: true,
      message: "Size variation updated successfully",
      data: existing,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating size variation",
      error: error.message,
    });
  }
};

exports.deleteSizeVariation = async (req, res) => {
  try {
    const existing = await productSizeVariation.findByPk(req.params.id);
    if (!existing) return res.status(404).json({ message: "Size variation not found" });

    await existing.destroy();
    res.status(200).json({ success: true, message: "Size variation deleted" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting size variation",
      error: error.message,
    });
  }
};
