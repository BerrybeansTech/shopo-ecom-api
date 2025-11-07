const path = require("path");
const fs = require("fs");
const { Op, fn, col, where, cast, literal } = require("sequelize");
const sequelize = require("../../config/db");

const Product = require("../../models/product/product.model");
const ProductCategory = require("../../models/product/product-category.model");
const ProductSubCategory = require("../../models/product/product-subCategory.model");
const ProductInventory = require("../../models/product/product-inventory.model");
// const ProductSubCategory = require("../models/productSubCategory.model");
// const ProductReview = require("../productReview/model");

const getAllProduct = async (req, res) => {
  try {
    const {
      newArrival,
      name,
      category,
      subCategory,
      status,
      userId,
      brandName,
      minPrice,
      maxPrice,
    } = req.query;

    const baseUrl = `${req.protocol}://${req.get("host")}/`;
    const whereClause = {};

    if (name) whereClause.name = { [Op.like]: `%${name}%` };
    if (category) whereClause.category = category;
    if (brandName) whereClause.brandName = brandName;
    if (status) whereClause.status = status;
    if (subCategory) whereClause.subCategoryId = subCategory;
    if (userId) whereClause.postedBy = userId;

    if (minPrice || maxPrice) {
      whereClause.price = {};

      if (minPrice) {
        whereClause.price[Op.gte] = parseInt(minPrice);
      }

      if (maxPrice) {
        whereClause.price[Op.lte] = parseInt(maxPrice);
      }
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
      },
      include: [
        {
          model: ProductReview,
          attributes: [],
          required: false,
        },
      ],
      attributes: {
        include: [
          [fn("AVG", col("productReviews.rating")), "averageRating"],
          [fn("COUNT", col("productReviews.id")), "reviewCount"],
        ],
      },
      group: ["Product.id"],

      group: ["Product.id"],
      subQuery: false,
      order: [["createdAt", "DESC"]],
    };

    if (newArrival) {
      queryOptions.where = { status: "approved" };
      queryOptions.limit = 5;
      queryOptions.order = [["createdAt", "DESC"]];
    }

    const products = await Product.findAll(queryOptions);

    const updatedProducts = products.map((product) => {
      const data = product.toJSON();
      data.thumbnailImage = data.thumbnailImage
        ? `${baseUrl}${data.thumbnailImage}`
        : null;
      data.averageRating = parseFloat(
        data.ProductReviews?.averageRating || 0
      ).toFixed(1);
      data.reviewCount = parseInt(data.ProductReviews?.reviewCount || 0);
      delete data.ProductReviews;
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
    console.error("error", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve Products",
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
    const baseUrl = `${req.protocol}://${req.get("host")}/`;

    const t = await Product.findOne({
      where: { id },
      include: [
        {
          model: ProductReview,
          attributes: [], // don't fetch all reviews, just for aggregation
        },
      ],
      attributes: {
        include: [
          [fn("AVG", col("productReviews.rating")), "averageRating"],
          [fn("COUNT", col("productReviews.id")), "reviewCount"],
        ],
      },
      group: ["Product.id"], // required with aggregation
    });

    if (!t) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const updatedThumbnailImage = `${baseUrl}${t.thumbnailImage}`;
    const updatedGalleryImage = Array.isArray(t.galleryImage)
      ? t.galleryImage.map((imgPath) => `${baseUrl}${imgPath}`)
      : [];

    const updatedProduct = {
      ...t.toJSON(),
      galleryImage: updatedGalleryImage,
      thumbnailImage: updatedThumbnailImage,
    };

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve Product by id",
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

    // handle file uploads
    const thumbnailImage = req.files?.thumbnailImage?.[0]
      ? `${process.env.FILE_PATH}${req.files.thumbnailImage[0].filename}`
      : null;

    const galleryImage = req.files?.galleryImage
      ? req.files.galleryImage.map(
          (file) => `${process.env.FILE_PATH}${file.filename}`
        )
      : [];

    let parsedApparelDetails = JSON.parse(aparelDetials);
    // if (typeof aparelDetials === "string") {
    //   try {
    //     parsedApparelDetails = JSON.parse(aparelDetials);
    //   } catch (err) {
    //     console.warn("Invalid aparelDetials format:", aparelDetials);
    //   }
    // } else {
    //   parsedApparelDetails = aparelDetials || {};
    // }

    console.log(
      "parsedApparelDetails.......................................",
      typeof parsedApparelDetails,
      parsedApparelDetails.occasionId
    );
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
        materialId: parsedApparelDetails.materialId,
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

    if (Array.isArray(inventory) && inventory.length > 0) {
      const inventoryRecords = inventory.map((item) => ({
        productId: newProduct.id,
        color: item.color,
        size: item.size,
        availableQty: item.availableQty,
      }));

      await ProductInventory.bulkCreate(inventoryRecords, { transaction });
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
    price,
    remarks,
    subCategoryId,
    postedBy,
    gst,
    hsnCode,
    priceLable,
    brandName,
    benefits,
    expiresOn,
    additionalInformation,
    status,
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
        price: parseInt(price),
        remarks,
        subCategoryId: subCategoryId,
        postedBy,
        priceLable,
        brandName,
        gst,
        hsnCode,
        benefits,
        expiresOn,
        additionalInformation,
        thumbnailImage,
        galleryImage,
        status,
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
};
