const ProductCategory = require("../../models/product/product-category.model");
const ProductSubCategory = require("../../models/product/product-subCategory.model");
const ProductChildCategory = require("../../models/product/product-childCategory.model");

const ensureTrailingSlash = (value) => {
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
};

const buildBaseUrl = (req) => {
  if (process.env.FILE_BASE_URL) {
    return ensureTrailingSlash(process.env.FILE_BASE_URL.trim());
  }
  const host = req.get("host");
  if (!host) return "";
  const protocol = req.protocol || "http";
  return ensureTrailingSlash(`${protocol}://${host}`);
};

const buildFileUrl = (req, filePath) => {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }
  const baseUrl = buildBaseUrl(req);
  if (!baseUrl) {
    return filePath;
  }
  const normalizedPath = filePath.replace(/^\/+/, "");
  return `${baseUrl}${normalizedPath}`;
};

const formatCategoryResponse = (category, req) => {
  if (!category) return null;
  const data = category.toJSON ? category.toJSON() : { ...category };
  data.image = buildFileUrl(req, data.image);
  return data;
};

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required and must be a non-empty string" });
    }

    let image = null;
    if (req.file) {
      image = `${process.env.FILE_PATH}${req.file.filename}`;
    }

    const category = await ProductCategory.create({ name: name.trim(), image });
    const formattedCategory = formatCategoryResponse(category, req);
    res.status(201).json({ success: true, message: "Category created successfully", data: formattedCategory });
  } catch (error) {
    console.error("Create Category Error:", error);
    // Handle Sequelize validation errors specifically
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while creating category" });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const host = req.get("host").split(":")[0];
    const baseUrl = `${req.protocol}://${host}/`;

    const categories = await ProductCategory.findAll({
      include: [
        {
          model: ProductSubCategory,
          as: "ProductSubCategories",
          include: [
            { model: ProductChildCategory, as: "ProductChildCategories" }
          ],
        },
      ],
      order: [["id", "ASC"]],
    });

    const formattedCategories = categories.map(category => {
      const categoryJson = category.toJSON();

      categoryJson.image = categoryJson.image
        ? `${baseUrl}${categoryJson.image}`
        : null;

      return categoryJson;
    });

    res.status(200).json({
      success: true,
      data: formattedCategories,
    });
  } catch (error) {
    console.error("Get Categories Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching categories",
    });
  }
};


exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID format" });
    }

    const category = await ProductCategory.findByPk(id, {
      include: [
        {
          model: ProductSubCategory,
          as: "ProductSubCategories",
          include: [{ model: ProductChildCategory, as: "ProductChildCategories" }],
        },
      ],
    });
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    const formattedCategory = formatCategoryResponse(category, req);
    res.status(200).json({ success: true, data: formattedCategory });
  } catch (error) {
    console.error("Get Category By Id Error:", error);
    res.status(500).json({ success: false, message: "Internal server error occurred while fetching category" });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID format" });
    }

    const category = await ProductCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: "Category name must be a non-empty string if provided" });
      }
      category.name = name.trim();
    }

    if (req.file) {
      category.image = `${process.env.FILE_PATH}${req.file.filename}`;
    }

    await category.save();

    
    const updatedCategory = await ProductCategory.findByPk(id, {
      include: [
        {
          model: ProductSubCategory,
          as: "ProductSubCategories",
          include: [{ model: ProductChildCategory, as: "ProductChildCategories" }],
        },
      ],
    });

    const formattedCategory = formatCategoryResponse(updatedCategory, req);
    res.status(200).json({ success: true, message: "Category updated successfully", data: formattedCategory });
  } catch (error) {
    console.error("Update Category Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while updating category" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid category ID format" });
    }

    const category = await ProductCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

 
    const subCategoryCount = await ProductSubCategory.count({ where: { categoryId: id } });
    if (subCategoryCount > 0) {
      return res.status(400).json({ success: false, message: "Cannot delete category with existing subcategories" });
    }

    await category.destroy();
    res.status(200).json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete Category Error:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ success: false, message: "Cannot delete category due to related subcategories" });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while deleting category" });
  }
};

exports.createSubCategory = async (req, res) => {
  try {
    const { name, categoryId } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: "Subcategory name is required and must be a non-empty string" });
    }
    if (!categoryId || !/^\d+$/.test(categoryId)) {
      return res.status(400).json({ success: false, message: "Valid categoryId is required" });
    }

 
    const category = await ProductCategory.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found for the provided categoryId" });
    }

    const subCategory = await ProductSubCategory.create({ name: name.trim(), categoryId });
    res.status(201).json({ success: true, message: "Subcategory created successfully", data: subCategory });
  } catch (error) {
    console.error("Create SubCategory Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while creating subcategory" });
  }
};

exports.getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await ProductSubCategory.findAll({
      include: [
        { model: ProductCategory, as: "ProductCategory", attributes: ["id", "name"] },
        { model: ProductChildCategory, as: "ProductChildCategories" },
      ],
    });
    res.status(200).json({ success: true, data: subCategories });
  } catch (error) {
    console.error("Get SubCategories Error:", error);
    res.status(500).json({ success: false, message: "Internal server error occurred while fetching subcategories" });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const host = req.get("host").split(":")[0];
    const baseUrl = `${req.protocol}://${host}/`;

    const category = await ProductCategory.findByPk(id, {
      include: [
        {
          model: ProductSubCategory,
          as: "ProductSubCategories",
          include: [
            { model: ProductChildCategory, as: "ProductChildCategories" }
          ],
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const categoryJson = category.toJSON();

    categoryJson.image = categoryJson.image
      ? `${baseUrl}${categoryJson.image}`
      : null;

    res.status(200).json({
      success: true,
      data: categoryJson,
    });
  } catch (error) {
    console.error("Get Category By Id Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching category",
    });
  }
};


exports.updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid subcategory ID format" });
    }

    const subCategory = await ProductSubCategory.findByPk(id);
    if (!subCategory) {
      return res.status(404).json({ success: false, message: "Subcategory not found" });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: "Subcategory name must be a non-empty string if provided" });
      }
      subCategory.name = name.trim();
    }

    if (categoryId !== undefined) {
      if (!/^\d+$/.test(categoryId)) {
        return res.status(400).json({ success: false, message: "Valid categoryId is required if provided" });
      }
   
      const category = await ProductCategory.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({ success: false, message: "Category not found for the provided categoryId" });
      }
      subCategory.categoryId = categoryId;
    }

    await subCategory.save();

    const updatedSubCategory = await ProductSubCategory.findByPk(id, {
      include: [
        { model: ProductCategory, as: "ProductCategory", attributes: ["id", "name"] },
        { model: ProductChildCategory, as: "ProductChildCategories" },
      ],
    });

    res.status(200).json({ success: true, message: "Subcategory updated successfully", data: updatedSubCategory });
  } catch (error) {
    console.error("Update SubCategory Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while updating subcategory" });
  }
};

exports.deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid subcategory ID format" });
    }

    const subCategory = await ProductSubCategory.findByPk(id);
    if (!subCategory) {
      return res.status(404).json({ success: false, message: "Subcategory not found" });
    }

   
    const childCategoryCount = await ProductChildCategory.count({ where: { subCategoryId: id } });
    if (childCategoryCount > 0) {
      return res.status(400).json({ success: false, message: "Cannot delete subcategory with existing child categories" });
    }

    await subCategory.destroy();
    res.status(200).json({ success: true, message: "Subcategory deleted successfully" });
  } catch (error) {
    console.error("Delete SubCategory Error:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ success: false, message: "Cannot delete subcategory due to related child categories" });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while deleting subcategory" });
  }
};

exports.createChildCategory = async (req, res) => {
  try {
    const { name, subCategoryId } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: "Child category name is required and must be a non-empty string" });
    }
    if (!subCategoryId || !/^\d+$/.test(subCategoryId)) {
      return res.status(400).json({ success: false, message: "Valid subCategoryId is required" });
    }


    const subCategory = await ProductSubCategory.findByPk(subCategoryId);
    if (!subCategory) {
      return res.status(404).json({ success: false, message: "Subcategory not found for the provided subCategoryId" });
    }

    const childCategory = await ProductChildCategory.create({ name: name.trim(), subCategoryId });
    res.status(201).json({ success: true, message: "Child category created successfully", data: childCategory });
  } catch (error) {
    console.error("Create ChildCategory Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while creating child category" });
  }
};

exports.getAllChildCategories = async (req, res) => {
  try {
    const childCategories = await ProductChildCategory.findAll({
      include: [{ model: ProductSubCategory, as: "ProductSubCategory", attributes: ["id", "name"] }],
    });
    res.status(200).json({ success: true, data: childCategories });
  } catch (error) {
    console.error("Get ChildCategories Error:", error);
    res.status(500).json({ success: false, message: "Internal server error occurred while fetching child categories" });
  }
};

exports.getChildCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid child category ID format" });
    }

    const childCategory = await ProductChildCategory.findByPk(id, {
      include: [{ model: ProductSubCategory, as: "ProductSubCategory", attributes: ["id", "name"] }],
    });
    if (!childCategory) {
      return res.status(404).json({ success: false, message: "Child category not found" });
    }
    res.status(200).json({ success: true, data: childCategory });
  } catch (error) {
    console.error("Get ChildCategory By Id Error:", error);
    res.status(500).json({ success: false, message: "Internal server error occurred while fetching child category" });
  }
};

exports.updateChildCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subCategoryId } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid child category ID format" });
    }

    const childCategory = await ProductChildCategory.findByPk(id);
    if (!childCategory) {
      return res.status(404).json({ success: false, message: "Child category not found" });
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, message: "Child category name must be a non-empty string if provided" });
      }
      childCategory.name = name.trim();
    }

    if (subCategoryId !== undefined) {
      if (!/^\d+$/.test(subCategoryId)) {
        return res.status(400).json({ success: false, message: "Valid subCategoryId is required if provided" });
      }
      // Validate subcategory exists
      const subCategory = await ProductSubCategory.findByPk(subCategoryId);
      if (!subCategory) {
        return res.status(404).json({ success: false, message: "Subcategory not found for the provided subCategoryId" });
      }
      childCategory.subCategoryId = subCategoryId;
    }

    await childCategory.save();

    // Reload with associations
    const updatedChildCategory = await ProductChildCategory.findByPk(id, {
      include: [{ model: ProductSubCategory, as: "ProductSubCategory", attributes: ["id", "name"] }],
    });

    res.status(200).json({ success: true, message: "Child category updated successfully", data: updatedChildCategory });
  } catch (error) {
    console.error("Update ChildCategory Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while updating child category" });
  }
};

exports.deleteChildCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, message: "Invalid child category ID format" });
    }

    const childCategory = await ProductChildCategory.findByPk(id);
    if (!childCategory) {
      return res.status(404).json({ success: false, message: "Child category not found" });
    }

    await childCategory.destroy();
    res.status(200).json({ success: true, message: "Child category deleted successfully" });
  } catch (error) {
    console.error("Delete ChildCategory Error:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ success: false, message: "Cannot delete child category due to related records" });
    }
    res.status(500).json({ success: false, message: "Internal server error occurred while deleting child category" });
  }
};