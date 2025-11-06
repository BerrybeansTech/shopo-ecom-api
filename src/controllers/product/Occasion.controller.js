const ProductOccasion = require("../../models/product/product-Occasion.model");

exports.createOccasion = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Occasion name is required" });

    const newOccasion = await ProductOccasion.create({ name });
    res.status(201).json({ message: "Occasion created successfully", data: newOccasion });
  } catch (error) {
    res.status(500).json({ message: "Error creating occasion", error: error.message });
  }
};

exports.getAllOccasions = async (req, res) => {
  try {
    const occasions = await ProductOccasion.findAll({ order: [["id", "DESC"]] });
    res.status(200).json(occasions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching occasions", error: error.message });
  }
};

exports.getOccasionById = async (req, res) => {
  try {
    const occasion = await ProductOccasion.findByPk(req.params.id);
    if (!occasion) return res.status(404).json({ message: "Occasion not found" });
    res.status(200).json(occasion);
  } catch (error) {
    res.status(500).json({ message: "Error fetching occasion", error: error.message });
  }
};

exports.updateOccasion = async (req, res) => {
  try {
    const { name } = req.body;
    const occasion = await ProductOccasion.findByPk(req.params.id);
    if (!occasion) return res.status(404).json({ message: "Occasion not found" });

    occasion.name = name || occasion.name;
    await occasion.save();

    res.status(200).json({ message: "Occasion updated successfully", data: occasion });
  } catch (error) {
    res.status(500).json({ message: "Error updating occasion", error: error.message });
  }
};

exports.deleteOccasion = async (req, res) => {
  try {
    const occasion = await ProductOccasion.findByPk(req.params.id);
    if (!occasion) return res.status(404).json({ message: "Occasion not found" });

    await occasion.destroy();
    res.status(200).json({ message: "Occasion deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting occasion", error: error.message });
  }
};
