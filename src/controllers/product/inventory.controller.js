const ProductInventory = require("../../models/product/product-inventory.model");
const Product = require("../../models/product/product.model");
const ProductColorVariation = require("../../models/product/product-colorVariation.model");
const ProductSizeVariation = require("../../models/product/product-sizeVariation.model"); // Assuming this model exists

exports.createInventory = async (req, res) => {
  try {
    const { productId, productColorVariationId, productSizeVariationId, availableQuantity } = req.body;

    if (!productId || !/^\d+$/.test(productId)) {
      return res.status(400).json({ success: false, message: "Valid productId is required" });
    }
    if (!productColorVariationId || !/^\d+$/.test(productColorVariationId)) {
      return res.status(400).json({ success: false, message: "Valid productColorVariationId is required" });
    }
    if (!productSizeVariationId || !/^\d+$/.test(productSizeVariationId)) {
      return res.status(400).json({ success: false, message: "Valid productSizeVariationId is required" });
    }
    if (!availableQuantity || typeof availableQuantity !== 'number' || availableQuantity < 0) {
      return res.status(400).json({ success: false, message: "availableQuantity must be a non-negative number" });
    }

    // Validate foreign keys exist
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found for the provided productId" });
    }

    const colorVariation = await ProductColorVariation.findByPk(productColorVariationId);
    if (!colorVariation) {
      return res.status(404).json({ success: false, message: "Color variation not found for the provided productColorVariationId" });
    }

    const sizeVariation = await ProductSizeVariation.findByPk(productSizeVariationId);
    if (!sizeVariation) {
      return res.status(404).json({ success: false, message: "Size variation not found for the provided productSizeVariationId" });
    }

    const inventory = await ProductInventory.create({
      productId,
      productColorVariationId,
      productSizeVariationId,
      availableQuantity
    });

    res.status(201).json({ success: true, message: "Inventory created successfully", data: inventory });
  } catch (error) {
    console.error("Create Inventory Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: "Inventory entry already exists for this product, color, and size combination" });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while creating inventory" });
  }
};

exports.getAllInventories = async (req, res) => {
  try {
    const inventories = await ProductInventory.findAll({
      include: [
        { model: Product, attributes: ["id", "name"] },
        { model: ProductColorVariation, attributes: ["id", "color"] },
        { model: ProductSizeVariation, attributes: ["id", "size"] }, // Assuming model
      ],
      order: [["id", "DESC"]],
    });
    res.status(200).json({ success: true, data: inventories });
  } catch (error) {
    console.error("Get All Inventories Error:", error);
    res.status(500).json({ success: false, message: "Internal server error occurred while fetching inventories" });
  }
};

exports.getInventoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid inventory ID format" });
    }

    const inventory = await ProductInventory.findByPk(id, {
      include: [
        { model: Product, attributes: ["id", "name"] },
        { model: ProductColorVariation, attributes: ["id", "color"] },
        { model: ProductSizeVariation, attributes: ["id", "size"] },
      ],
    });
    if (!inventory) {
      return res.status(404).json({ success: false, message: "Inventory not found" });
    }
    res.status(200).json({ success: true, data: inventory });
  } catch (error) {
    console.error("Get Inventory By Id Error:", error);
    res.status(500).json({ success: false, message: "Internal server error occurred while fetching inventory" });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { availableQuantity } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid inventory ID format" });
    }

    const inventory = await ProductInventory.findByPk(id);
    if (!inventory) {
      return res.status(404).json({ success: false, message: "Inventory not found" });
    }

    if (availableQuantity !== undefined) {
      if (typeof availableQuantity !== 'number' || availableQuantity < 0) {
        return res.status(400).json({ success: false, message: "availableQuantity must be a non-negative number if provided" });
      }
      inventory.availableQuantity = availableQuantity;
    }

    await inventory.save();

    // Reload with associations
    const updatedInventory = await ProductInventory.findByPk(id, {
      include: [
        { model: Product, attributes: ["id", "name"] },
        { model: ProductColorVariation, attributes: ["id", "color"] },
        { model: ProductSizeVariation, attributes: ["id", "size"] },
      ],
    });

    res.status(200).json({ success: true, message: "Inventory updated successfully", data: updatedInventory });
  } catch (error) {
    console.error("Update Inventory Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while updating inventory" });
  }
};

exports.deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid inventory ID format" });
    }

    const inventory = await ProductInventory.findByPk(id);
    if (!inventory) {
      return res.status(404).json({ success: false, message: "Inventory not found" });
    }

  

    await inventory.destroy();
    res.status(200).json({ success: true, message: "Inventory deleted successfully" });
  } catch (error) {
    console.error("Delete Inventory Error:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ success: false, message: "Cannot delete inventory due to related records" });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while deleting inventory" });
  }
};