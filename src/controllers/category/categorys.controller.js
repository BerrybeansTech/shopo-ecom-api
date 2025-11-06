const ProductCategory = require("../../models/product/product-category.model");
const ProductSubCategory = require("../../models/product/product-subCategory.model");
const ProductChildCategory = require("../../models/product/product-childCategory.model");



exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Category name is required" });

    const category = await ProductCategory.create({ name });
    res.status(201).json({ success: true, message: "Category created successfully", data: category });
  } catch (error) {
    console.error("Create Category Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getAllCategories = async (req, res) => {
  try {
    const categories = await ProductCategory.findAll({
      include: [
        {
          model: ProductSubCategory,
          as: "ProductSubCategories",
          include: [{ model: ProductChildCategory, as: "ProductChildCategories" }],
        },
      ],
      order: [["id", "ASC"]],
    });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error("Get Categories Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const category = await ProductCategory.findByPk(id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    category.name = name || category.name;
    await category.save();

    res.status(200).json({ success: true, message: "Category updated successfully", data: category });
  } catch (error) {
    console.error("Update Category Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await ProductCategory.findByPk(id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    await category.destroy();
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete Category Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



exports.createSubCategory = async (req, res) => {
  try {
    const { name, categoryId } = req.body;
    if (!name || !categoryId)
      return res.status(400).json({ success: false, message: "Name and categoryId are required" });

    const subCategory = await ProductSubCategory.create({ name, categoryId });
    res.status(201).json({ success: true, message: "Subcategory created successfully", data: subCategory });
  } catch (error) {
    console.error("Create SubCategory Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await ProductSubCategory.findAll({
      include: [
        { model: ProductCategory, attributes: ["id", "name"] },
        { model: ProductChildCategory, as: "ProductChildCategories" },
      ],
    });
    res.status(200).json({ success: true, data: subCategories });
  } catch (error) {
    console.error("Get SubCategories Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId } = req.body;

    const subCategory = await ProductSubCategory.findByPk(id);
    if (!subCategory) return res.status(404).json({ success: false, message: "Subcategory not found" });

    subCategory.name = name || subCategory.name;
    subCategory.categoryId = categoryId || subCategory.categoryId;
    await subCategory.save();

    res.status(200).json({ success: true, message: "Subcategory updated successfully", data: subCategory });
  } catch (error) {
    console.error("Update SubCategory Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const subCategory = await ProductSubCategory.findByPk(id);
    if (!subCategory) return res.status(404).json({ success: false, message: "Subcategory not found" });

    await subCategory.destroy();
    res.status(200).json({ success: true, message: "Subcategory deleted successfully" });
  } catch (error) {
    console.error("Delete SubCategory Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



exports.createChildCategory = async (req, res) => {
  try {
    const { name, subCategoryId } = req.body;
    if (!name || !subCategoryId)
      return res.status(400).json({ success: false, message: "Name and subCategoryId are required" });

    const childCategory = await ProductChildCategory.create({ name, subCategoryId });
    res.status(201).json({ success: true, message: "Child category created successfully", data: childCategory });
  } catch (error) {
    console.error("Create ChildCategory Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getAllChildCategories = async (req, res) => {
  try {
    const childCategories = await ProductChildCategory.findAll({
      include: [{ model: ProductSubCategory, attributes: ["id", "name"] }],
    });
    res.status(200).json({ success: true, data: childCategories });
  } catch (error) {
    console.error("Get ChildCategories Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateChildCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subCategoryId } = req.body;

    const childCategory = await ProductChildCategory.findByPk(id);
    if (!childCategory) return res.status(404).json({ success: false, message: "Child category not found" });

    childCategory.name = name || childCategory.name;
    childCategory.subCategoryId = subCategoryId || childCategory.subCategoryId;
    await childCategory.save();

    res.status(200).json({ success: true, message: "Child category updated successfully", data: childCategory });
  } catch (error) {
    console.error("Update ChildCategory Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteChildCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const childCategory = await ProductChildCategory.findByPk(id);
    if (!childCategory) return res.status(404).json({ success: false, message: "Child category not found" });

    await childCategory.destroy();
    res.status(200).json({ success: true, message: "Child category deleted successfully" });
  } catch (error) {
    console.error("Delete ChildCategory Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
