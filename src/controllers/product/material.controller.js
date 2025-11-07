const ProductMaterial = require("../../models/product/product-material.model");

exports.createMaterial = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Material name is required" });

    const newMaterial = await ProductMaterial.create({ name });
    res.status(201).json({ message: "Material created successfully", data: newMaterial });
  } catch (error) {
    res.status(500).json({ message: "Error creating material", error: error.message });
  }
};

exports.getAllMaterials = async (req, res) => {
  try {
    const materials = await ProductMaterial.findAll({ order: [["id", "DESC"]] });
    res.status(200).json(materials);
  } catch (error) {
    res.status(500).json({ message: "Error fetching materials", error: error.message });
  }
};

exports.getMaterialById = async (req, res) => {
  try {
    const material = await ProductMaterial.findByPk(req.params.id);
    if (!material) return res.status(404).json({ message: "Material not found" });
    res.status(200).json(material);
  } catch (error) {
    res.status(500).json({ message: "Error fetching material", error: error.message });
  }
};

exports.updateMaterial = async (req, res) => {
  try {
    const { name } = req.body;
    const material = await ProductMaterial.findByPk(req.params.id);
    if (!material) return res.status(404).json({ message: "Material not found" });

    material.name = name || material.name;
    await material.save();

    res.status(200).json({ message: "Material updated successfully", data: material });
  } catch (error) {
    res.status(500).json({ message: "Error updating material", error: error.message });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    const material = await ProductMaterial.findByPk(req.params.id);
    if (!material) return res.status(404).json({ message: "Material not found" });

    await material.destroy();
    res.status(200).json({ message: "Material deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting material", error: error.message });
  }
};
