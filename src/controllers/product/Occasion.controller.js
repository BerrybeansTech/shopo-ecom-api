const ProductOccasion = require("../../models/product/product-Occasion.model");

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
    const occasions = await ProductOccasion.findAll({
      order: [["id", "DESC"]],
    });
    res.status(200).json({ success: true, data: occasions });
  } catch (error) {
    console.error("Get All Occasions Error:", error);
    res.status(500).json({ success: false, message: "Internal server error occurred while fetching occasions" });
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