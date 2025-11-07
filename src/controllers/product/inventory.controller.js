const ProductInventory = require("../../models/product/product-inventory.model");

exports.createInventory = async (req, res) => {
  try {
    const { productId, productColorVariationId, productSizeVariationId, availableQuantity } = req.body;

    if (!productId || !productColorVariationId || !productSizeVariationId || !availableQuantity) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const inventory = await ProductInventory.create({
      productId,
      productColorVariationId,
      productSizeVariationId,
      availableQuantity
    });

    res.status(201).json({ message: "Inventory created successfully", data: inventory });
  } catch (error) {
    res.status(500).json({ message: "Error creating inventory", error: error.message });
  }
};

exports.getAllInventories = async (req, res) => {
  try {
    const inventories = await ProductInventory.findAll({ order: [["id", "DESC"]] });
    res.status(200).json(inventories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching inventories", error: error.message });
  }
};

exports.getInventoryById = async (req, res) => {
  try {
    const inventory = await ProductInventory.findByPk(req.params.id);
    if (!inventory) return res.status(404).json({ message: "Inventory not found" });
    res.status(200).json(inventory);
  } catch (error) {
    res.status(500).json({ message: "Error fetching inventory", error: error.message });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    const { availableQuantity } = req.body;
    const inventory = await ProductInventory.findByPk(req.params.id);
    if (!inventory) return res.status(404).json({ message: "Inventory not found" });

    inventory.availableQuantity = availableQuantity || inventory.availableQuantity;
    await inventory.save();

    res.status(200).json({ message: "Inventory updated successfully", data: inventory });
  } catch (error) {
    res.status(500).json({ message: "Error updating inventory", error: error.message });
  }
};

exports.deleteInventory = async (req, res) => {
  try {
    const inventory = await ProductInventory.findByPk(req.params.id);
    if (!inventory) return res.status(404).json({ message: "Inventory not found" });

    await inventory.destroy();
    res.status(200).json({ message: "Inventory deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting inventory", error: error.message });
  }
};
