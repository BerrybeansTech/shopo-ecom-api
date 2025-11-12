const productSizeVariation = require("../../models/product/product-sizeVariation.model");

exports.createSizeVariation = async (req, res) => {
  try {
    const { type, size } = req.body;

    if (!type || typeof type !== 'string' || !type.trim()) {
      return res.status(400).json({ success: false, message: "Type is required and must be a non-empty string" });
    }
    if (!size || (typeof size !== 'string' && !Array.isArray(size)) || (typeof size === 'string' && !size.trim())) {
      return res.status(400).json({ success: false, message: "Size is required and must be a non-empty string or array of strings" });
    }

   
    let sizeArray = Array.isArray(size) ? size : [size.trim()];
    sizeArray = sizeArray.filter(s => s && typeof s === 'string' && s.trim()).map(s => s.trim());

    if (sizeArray.length === 0) {
      return res.status(400).json({ success: false, message: "Size array must contain at least one non-empty string" });
    }

    const newSize = await productSizeVariation.create({ type: type.trim(), size: sizeArray });

    res.status(201).json({
      success: true,
      message: "Size variation created successfully",
      data: newSize,
    });
  } catch (error) {
    console.error("Create Size Variation Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: "Size variation with this type already exists" });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while creating size variation"
    });
  }
};

exports.getAllSizeVariations = async (req, res) => {
  try {
    const { type } = req.query;
    const where = type && typeof type === 'string' && type.trim() ? { where: { type: type.trim() } } : {};
    const sizes = await productSizeVariation.findAll({
      ...where,
      order: [["id", "ASC"]]
    });
    res.status(200).json({ success: true, data: sizes });
  } catch (error) {
    console.error("Get All Size Variations Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching size variations"
    });
  }
};

exports.getSizeVariationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid size variation ID format" });
    }

    const size = await productSizeVariation.findByPk(id);
    if (!size) {
      return res.status(404).json({ success: false, message: "Size variation not found" });
    }
    res.status(200).json({ success: true, data: size });
  } catch (error) {
    console.error("Get Size Variation By Id Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching size variation"
    });
  }
};

exports.updateSizeVariation = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, size } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid size variation ID format" });
    }

    const existing = await productSizeVariation.findByPk(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Size variation not found" });
    }

    if (type !== undefined) {
      if (typeof type !== 'string' || !type.trim()) {
        return res.status(400).json({ success: false, message: "Type must be a non-empty string if provided" });
      }
      existing.type = type.trim();
    }

    if (size !== undefined) {
      if (typeof size !== 'string' && !Array.isArray(size)) {
        return res.status(400).json({ success: false, message: "Size must be a string or array of strings if provided" });
      }
      let sizeArray = Array.isArray(size) ? size : [size];
      sizeArray = sizeArray.filter(s => s && typeof s === 'string' && s.trim()).map(s => s.trim());
      if (sizeArray.length === 0) {
        return res.status(400).json({ success: false, message: "Size array must contain at least one non-empty string if provided" });
      }
      existing.size = sizeArray;
    }

    await existing.save();

  
    const updatedSize = await productSizeVariation.findByPk(id);
    res.status(200).json({
      success: true,
      message: "Size variation updated successfully",
      data: updatedSize,
    });
  } catch (error) {
    console.error("Update Size Variation Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: "Size variation with this type already exists" });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while updating size variation"
    });
  }
};

exports.deleteSizeVariation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid size variation ID format" });
    }

    const existing = await productSizeVariation.findByPk(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Size variation not found" });
    }


    await existing.destroy();
    res.status(200).json({ success: true, message: "Size variation deleted successfully" });
  } catch (error) {
    console.error("Delete Size Variation Error:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ success: false, message: "Cannot delete size variation due to related products" });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while deleting size variation"
    });
  }
};