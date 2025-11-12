const path = require("path");
const fs = require("fs");
const { Op, fn, col, where, cast, literal } = require("sequelize");
const sequelize = require("../../config/db");

const Product = require("../../models/product/product.model");
const ProductCategory = require("../../models/product/product-category.model");
const ProductSubCategory = require("../../models/product/product-subCategory.model");
const ProductChildCategory = require("../../models/product/product-childCategory.model");
const ProductInventory = require("../../models/product/product-inventory.model");
const ProductMaterial = require("../../models/product/product-material.model");
const ProductColorVariation = require("../../models/product/product-colorVariation.model");
const ProductSizeVariation = require("../../models/product/product-sizeVariation.model");
const ProductOccasion = require("../../models/product/product-Occasion.model");
// const ProductSubCategory = require("../models/productSubCategory.model");
const ProductReview = require("../../models/product/product-review");

const getAllProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      subCategory,
      childCategory,
      productColor,
      productSize,
      occasion,
      status,
      minPrice,
      maxPrice,
      newArrival,
    } = req.query;

    const host = req.get("host").split(":")[0];
    const baseUrl = `${req.protocol}://${host}/`;
    // const baseUrl = `${req.protocol}://${req.get("host")}/`;

    console.log("baseUrl",baseUrl);
    
    const whereClause = {};

    if (name) whereClause.name = { [Op.like]: `%${name}%` };
    if (status) whereClause.status = status;
    if (occasion) whereClause.occasionId = occasion;
    if (category) whereClause.categoryId = category;
    if (subCategory) whereClause.subCategoryId = subCategory;
    if (childCategory) whereClause.childCategoryId = childCategory;

    if (minPrice || maxPrice) {
      whereClause.sellingPrice = {};
      if (minPrice) whereClause.sellingPrice[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereClause.sellingPrice[Op.lte] = parseFloat(maxPrice);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const queryOptions = {
      where: whereClause,
      limit,
      offset,
      attributes: {
        exclude: [
          "createdAt",
          "updatedAt",
          "galleryImage",
          "additionalInformation",
        ],
        include: [
          [
            literal(`(
        SELECT IFNULL(AVG(rating), 0)
        FROM productReview AS pr
        WHERE pr.productId = Product.id
      )`),
            "averageRating",
          ],
          [
            literal(`(
        SELECT COUNT(*)
        FROM productReview AS pr
        WHERE pr.productId = Product.id
      )`),
            "reviewCount",
          ],
        ],
      },
      include: [
        {
          model: ProductReview,
          as: "productReviews",
          attributes: [],
          required: false,
        },
        {
          model: ProductCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: ProductSubCategory,
          as: "subCategory",
          attributes: ["id", "name"],
        },
        {
          model: ProductChildCategory,
          as: "childCategory",
          attributes: ["id", "name"],
        },
        {
          model: ProductOccasion,
          as: "occasion",
          attributes: ["id", "name"],
        },
        {
          model: ProductInventory,
          as: "inventories",
          include: [
            {
              model: ProductColorVariation,
              as: "productColor",
              attributes: ["id", "color"],
              where: productColor ? { color: productColor } : undefined,
              required: !!productColor,
            },
            {
              model: ProductSizeVariation,
              as: "productSize",
              attributes: ["id", "size"],
              where: productSize ? { size: productSize } : undefined,
              required: !!productSize,
            },
          ],
          attributes: ["id", "availableQuantity"],
          required: false,
        },
      ],
      // group: ["Product.id"],
      subQuery: false,
      order: [["createdAt", "DESC"]],
    };

    if (newArrival) {
      queryOptions.where.status = "approved";
      queryOptions.limit = 5;
      queryOptions.order = [["createdAt", "DESC"]];
    }

    const products = await Product.findAll(queryOptions);

    const updatedProducts = products.map((product) => {
      const data = product.toJSON();

      data.thumbnailImage = data.thumbnailImage
        ? `${baseUrl}${data.thumbnailImage}`
        : null;

      let galleryArray = [];
      if (data.galleryImage) {
        try {
          galleryArray = Array.isArray(data.galleryImage)
            ? data.galleryImage
            : JSON.parse(data.galleryImage);
        } catch {
          galleryArray = [];
        }
      }

      data.galleryImage = galleryArray.map((img) => `${baseUrl}${img}`);
      data.averageRating = parseFloat(data.averageRating || 0).toFixed(1);
      data.reviewCount = parseInt(data.reviewCount || 0);
      return data;
    });

    let count = 0;
    if (!newArrival) {
      count = await Product.count({ where: whereClause });
    }

    res.json({
      success: true,
      data: updatedProducts,
      ...(newArrival
        ? {}
        : {
            pagination: {
              total: count,
              page,
              limit,
              totalPages: Math.ceil(count / limit),
            },
          }),
    });
  } catch (error) {
    console.error("Error retrieving products:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve Products",
      error: error.message,
    });
  }
};

const getProductCatagory = async (req, res) => {
  try {
    const t = await ProductCategory.findAll();

    if (!t) {
      return res
        .status(404)
        .json({ success: false, message: "Product Catagory not found" });
    }

    res.json({ success: true, data: t });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve Product Catagory",
    });
  }
};

const getProductSubCatagory = async (req, res) => {
  const { id } = req.params;

  try {
    const t = await ProductSubCategory.findAll({ where: { categoryId: id } });

    if (!t) {
      return res
        .status(404)
        .json({ success: false, message: "Product sub Catagory not found" });
    }

    res.json({ success: true, data: t });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve Product sub Catagory",
    });
  }
};

const getAllCategoriesWithSubcategories = async (req, res) => {
  try {
    const categories = await ProductCategory.findAll({
      include: [
        {
          model: ProductSubCategory,
        },
      ],
    });

    if (!categories || categories.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No categories found" });
    }

    res.json({ success: true, data: categories });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve categories and subcategories",
    });
  }
};
const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    // const baseUrl = `${req.protocol}://${req.get("host")}/`;
    
    const host = req.get("host").split(":")[0];
    const baseUrl = `${req.protocol}://${host}/`;

    const product = await Product.findOne({
      where: { id },
      include: [
        {
          model: ProductCategory,
          as: "category",
          attributes: ["id", "name"],
        },
        {
          model: ProductSubCategory,
          as: "subCategory",
          attributes: ["id", "name"],
        },
        {
          model: ProductChildCategory,
          as: "childCategory",
          attributes: ["id", "name"],
        },
        {
          model: ProductMaterial,
          as: "material",
          attributes: ["id", "name"],
        },
        {
          model: ProductOccasion,
          as: "occasion",
          attributes: ["id", "name"],
        },
        {
          model: ProductInventory,
          as: "inventories",
          include: [
            {
              model: ProductColorVariation,
              as: "productColor",
              attributes: ["id", "color"],
            },
            {
              model: ProductSizeVariation,
              as: "productSize",
              attributes: ["id", "size"],
            },
          ],
          attributes: ["id", "availableQuantity"],
        },
      ],
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    let galleryArray = [];
    if (product.galleryImage) {
      try {
        galleryArray = Array.isArray(product.galleryImage)
          ? product.galleryImage
          : JSON.parse(product.galleryImage);
      } catch (err) {
        console.error("Invalid galleryImage JSON:", product.galleryImage);
        galleryArray = [];
      }
    }

    const updatedThumbnailImage = product.thumbnailImage
      ? `${baseUrl}${product.thumbnailImage}`
      : null;
    console.log(
      "Array.isArray(product.galleryImage)",
      Array.isArray(product.galleryImage),
      product.galleryImage
    );

    const updatedGalleryImage = galleryArray.map(
      (imgPath) => `${baseUrl}${imgPath}`
    );

    const ratings = product.productReviews?.map((r) => r.rating) || [];
    const averageRating =
      ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
        : 0;

    const updatedProduct = {
      ...product.toJSON(),
      thumbnailImage: updatedThumbnailImage,
      galleryImage: updatedGalleryImage,
      averageRating,
      reviewCount: ratings.length,
    };

    res.status(200).json({
      success: true,
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error retrieving product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve Product details",
      error: error.message,
    });
  }
};

// create product sample body:
// {
//    name:"",
//    description: "",
//    metaTitle: "",
//    metaDescription: "",
//    careInstructions: "",
//    categoryId: "",
//    subCategoryId: "",
//    childCategoryId: "",
//    aparelDetials: {
//        materialId: "",
//        fitType: "",
//        occasionId: "",
//        seasonal: "",
//     },
//    inventory: {
//         {
//            color: "",
//            size: "",
//            availableQty: ""
//          }
//      },
//     mrp: "",
//     sellingPrice: "",
//     gst: "",
//     thumbnailImage: "",
//     galleryImage: ""
//    }
// }

const createProduct = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      name,
      description,
      metaTitle,
      metaDescription,
      careInstructions,
      categoryId,
      subCategoryId,
      childCategoryId,
      aparelDetials,
      inventory,
      mrp,
      sellingPrice,
      gst,
    } = req.body;

    // Handle file uploads
    const thumbnailImage = req.files?.thumbnailImage?.[0]
      ? `${process.env.FILE_PATH}${req.files.thumbnailImage[0].filename}`
      : null;

    const galleryImage = req.files?.galleryImage
      ? req.files.galleryImage.map(
          (file) => `${process.env.FILE_PATH}${file.filename}`
        )
      : [];
      

    let parsedApparelDetails = {};
    try {
      parsedApparelDetails =
        typeof aparelDetials === "string"
          ? JSON.parse(aparelDetials)
          : aparelDetials || {};
    } catch (err) {
      console.warn("Invalid aparelDetials JSON:", aparelDetials);
    }

    const newProduct = await Product.create(
      {
        name,
        description,
        metaTitle,
        metaDescription,
        careInstructions,
        categoryId,
        subCategoryId,
        childCategoryId,
        productMaterialId: parsedApparelDetails.productMaterialId,
        fitType: parsedApparelDetails.fitType,
        occasionId: parsedApparelDetails.occasionId,
        seasonal: parsedApparelDetails.seasonal,
        mrp: parseFloat(mrp),
        sellingPrice: parseFloat(sellingPrice),
        gst: parseFloat(gst),
        thumbnailImage,
        galleryImage: JSON.stringify(galleryImage),
      },
      { transaction }
    );

    let parsedInventory = [];
    try {
      let rawInventory = inventory;

      if (typeof rawInventory === "string") {
        rawInventory = rawInventory.trim();

        parsedInventory = JSON.parse(rawInventory);
      } else if (Array.isArray(rawInventory)) {
        parsedInventory = rawInventory;
      }

      if (!Array.isArray(parsedInventory)) parsedInventory = [];
    } catch (err) {
      console.warn("Invalid inventory JSON:", inventory);
      parsedInventory = [];
    }

    if (parsedInventory.length > 0) {
      const inventoryRecords = parsedInventory
        .filter(
          (item) =>
            item.productColorVariationId &&
            item.productSizeVariationId &&
            item.availableQuantity
        )
        .map((item) => ({
          productId: newProduct.id,
          productColorVariationId: parseInt(item.productColorVariationId, 10),
          productSizeVariationId: parseInt(item.productSizeVariationId, 10),
          availableQuantity: parseInt(item.availableQuantity, 10),
        }));

      if (inventoryRecords.length > 0) {
        await ProductInventory.bulkCreate(inventoryRecords, { transaction });
      } else {
        console.warn("No valid inventory records to insert.");
      }
    } else {
      console.warn("Inventory is empty or invalid.");
    }

    await transaction.commit();

    res.json({
      success: true,
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (error) {
    console.error("Error creating Product:", error);
    await transaction.rollback();
    res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

const updateProduct = async (req, res) => {
  let {
    id,
    name,
    description,
    metaTitle,
    metaDescription,
    careInstructions,
    categoryId,
    subCategoryId,
    childCategoryId,
    aparelDetials,
    inventory,
    mrp,
    sellingPrice,
    gst,
    oldGalleryImage = [],
  } = req.body;

  try {
    console.log(
      "typeof oldGalleryImage",
      typeof oldGalleryImage,
      oldGalleryImage
    );
    if (typeof oldGalleryImage == "string") {
      try {
        oldGalleryImage = JSON.parse(oldGalleryImage);
      } catch (err) {
        oldGalleryImage = [];
      }
    }
    oldGalleryImage = oldGalleryImage.map((img) => {
      const uploadIndex = img.indexOf("uploads/");
      return uploadIndex !== -1 ? img.slice(uploadIndex) : img;
    });

    const existing = await Product.findByPk(id);

    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }
    console.log(
      "oldGalleryImage>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>",
      oldGalleryImage
    );
    let thumbnailImage = existing.thumbnailImage;
    let galleryImage = [...oldGalleryImage];
    console.log(
      "galleryImage<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<",
      galleryImage
    );

    const removedImages = (existing.galleryImage || []).filter(
      (img) => !oldGalleryImage.includes(img)
    );

    for (const img of removedImages) {
      const oldGalleryPath = path.join(__dirname, "..", img);
      if (fs.existsSync(oldGalleryPath)) {
        fs.unlinkSync(oldGalleryPath);
      }
    }

    if (req.files?.galleryImage?.length > 0) {
      const newGalleryImages = req.files.galleryImage.map(
        (file) => `${process.env.FILE_PATH}${file.filename}`
      );
      galleryImage = [...galleryImage, ...newGalleryImages];
    }

    if (req.files?.thumbnailImage?.[0]) {
      if (thumbnailImage) {
        const oldThumbPath = path.join(__dirname, "..", thumbnailImage);
        if (fs.existsSync(oldThumbPath)) {
          fs.unlinkSync(oldThumbPath);
        }
      }
      thumbnailImage = `${process.env.FILE_PATH}${req.files.thumbnailImage[0].filename}`;
    }

    await Product.update(
      {
        name,
        description,
        metaTitle,
        metaDescription,
        careInstructions,
        categoryId,
        subCategoryId,
        childCategoryId,
        aparelDetials,
        inventory,
        mrp,
        sellingPrice,
        gst,
        thumbnailImage,
        galleryImage,
      },
      { where: { id } }
    );

    res.json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating Product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update Product",
    });
  }
};

const updateInventory = async (req, res) => {
  let {
    id,
    productColorVariationId,
    productSizeVariationId,
    availableQuantity,
  } = req.body;

  try {
    await ProductInventory.update(
      {
        productColorVariationId,
        productSizeVariationId,
        availableQuantity,
      },
      { where: { id } }
    );

    res.json({ success: true, message: "Inventory updated successfully" });
  } catch (error) {
    console.error("Error updating Inventory:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update Inventory",
    });
  }
};

const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const ProductData = await Product.findOne({ where: { id } });

    if (!ProductData) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    if (Array.isArray(ProductData.image)) {
      ProductData.image.forEach((imgPath) => {
        const fullPath = path.join(__dirname, "..", imgPath);
        fs.unlink(fullPath, (err) => {
          if (err) console.error(`Failed to delete file: ${fullPath}`, err);
        });
      });
    }

    await Product.destroy({ where: { id } });

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting Product:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete Product",
    });
  }
};

module.exports = {
  getAllProduct,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductCatagory,
  getProductSubCatagory,
  getAllCategoriesWithSubcategories,
  updateInventory
};
