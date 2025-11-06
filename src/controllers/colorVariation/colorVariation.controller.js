const productColorVariation = require("../../models/product/product-colorVariation.model");


exports.createColorVariation = async (req, res) => {
  try {
    const { color } = req.body;
    if (!color) return res.status(400).json({ message: "Color is required" });

    const newColor = await productColorVariation.create({ color });
    res.status(201).json({ message: "Color variation created successfully", data: newColor });
  } catch (error) {
    res.status(500).json({ message: "Error creating color variation", error: error.message });
  }
};

exports.getAllColorVariations = async (req, res) => {
  try {
    const colors = await productColorVariation.findAll();
    res.status(200).json({ data: colors });
  } catch (error) {
    res.status(500).json({ message: "Error fetching color variations", error: error.message });
  }
};


exports.getColorVariationById = async (req, res) => {
  try {
    const color = await productColorVariation.findByPk(req.params.id);
    if (!color) return res.status(404).json({ message: "Color variation not found" });

    res.status(200).json({ data: color });
  } catch (error) {
    res.status(500).json({ message: "Error fetching color variation", error: error.message });
  }
};


exports.updateColorVariation = async (req, res) => {
  try {
    const { color } = req.body;
    const existing = await productColorVariation.findByPk(req.params.id);

    if (!existing) return res.status(404).json({ message: "Color variation not found" });

    existing.color = color || existing.color;
    await existing.save();

    res.status(200).json({ message: "Color variation updated", data: existing });
  } catch (error) {
    res.status(500).json({ message: "Error updating color variation", error: error.message });
  }
};


exports.deleteColorVariation = async (req, res) => {
  try {
    const existing = await productColorVariation.findByPk(req.params.id);
    if (!existing) return res.status(404).json({ message: "Color variation not found" });

    await existing.destroy();
    res.status(200).json({ message: "Color variation deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting color variation", error: error.message });
  }
};
