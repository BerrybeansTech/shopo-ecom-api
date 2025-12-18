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
      seasonal,
      category,
      subCategory,
      childCategory,
      productColor,
      productSize,
      productMaterial,
      material,
      fitType,
      occasion,
      status,
      minPrice,
      maxPrice,
      newArrival,
      sort = "createdAt",
      sortingOrder = "DESC"
    } = req.query;

    const host = req.get("host").split(":")[0];
    const baseUrl = `${req.protocol}://${host}/`;
    // const baseUrl = `${req.protocol}://${req.get("host")}/`;

    console.log("baseUrl", baseUrl);

    const whereClause = {};

    if (name) whereClause.name = { [Op.like]: `%${name}%` };
    if (seasonal) whereClause.seasonal = { [Op.like]: `%${seasonal}%` };
    if (status) whereClause.status = status;
    if (fitType) {
      const fitTypeArray = fitType.split(",").map((id) => Number(id.trim()));
      whereClause.fitTypeId = { [Op.in]: fitTypeArray };
    }
    if (occasion) {
      const occasionArray = occasion.split(",").map((id) => Number(id.trim()));
      whereClause.occasionId = { [Op.in]: occasionArray };
    }

    if (productMaterial || material) {
      const materialParam = productMaterial || material;
      const productMaterialArray = materialParam
        .split(",")
        .map((id) => Number(id.trim()));

      whereClause.productMaterialId = { [Op.in]: productMaterialArray };
    }
    if (category) {
      const categoryArray = category.split(",").map((id) => Number(id.trim()));

      whereClause.categoryId = { [Op.in]: categoryArray };
    }

    if (subCategory) {
      const subCategoryArray = subCategory.split(",").map((id) => Number(id.trim()));
      whereClause.subCategoryId = { [Op.in]: subCategoryArray };
    }
    if (childCategory) {
      const childCategoryArray = childCategory.split(",").map((id) => Number(id.trim()));
      whereClause.childCategoryId = { [Op.in]: childCategoryArray };
    }

    if (minPrice || maxPrice) {
      whereClause.sellingPrice = {};
      if (minPrice) whereClause.sellingPrice[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereClause.sellingPrice[Op.lte] = parseFloat(maxPrice);
    }

    // Parse multi-select filters for colors and sizes.
    // Comma-separated values mean OR (use Op.in). Combining different filters
    // (e.g. productColor=Red,Blue&productSize=M,L) will apply both (AND).
    let productColorArray;
    if (productColor) {
      productColorArray = productColor
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    }

    let productSizeArray;
    if (productSize) {
      productSizeArray = productSize
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // Resolve variation IDs for size and colors to avoid ON-clause alias problems
    let matchingSizeIds = null;
    if (productSizeArray && productSizeArray.length) {
      const jsonSizes = JSON.stringify(productSizeArray);
      const sizeRows = await ProductSizeVariation.findAll({
        where: where(fn("JSON_OVERLAPS", col("size"), literal(`'${jsonSizes}'`)), true),
        attributes: ["id"],
      });
      matchingSizeIds = sizeRows.map((r) => r.id);
      // if no matching size variations, return early with empty result
      if (!matchingSizeIds.length) {
        return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: parseInt(req.query.limit) || 10, totalPages: 0 } });
      }
    }

    let matchingColorIds = null;
    if (productColorArray && productColorArray.length) {
      const colorRows = await ProductColorVariation.findAll({
        where: { color: { [Op.in]: productColorArray } },
        attributes: ["id"],
      });
      matchingColorIds = colorRows.map((r) => r.id);
      if (!matchingColorIds.length) {
        return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: parseInt(req.query.limit) || 10, totalPages: 0 } });
      }
    }

    // --- Review-based filtering ---
    // Supported query params:
    // - minAvgRating=4
    // - minReviewCount=10
    // - ratingCount[5]=3  (number of 5-star reviews >= 3)
    const minAvgRating = req.query.minAvgRating ? parseFloat(req.query.minAvgRating) : null;
    const minReviewCount = req.query.minReviewCount ? parseInt(req.query.minReviewCount, 10) : null;

    // ratingCount can be parsed as an object like { '5': '3' }
    const ratingCountFilters = {};
    if (req.query.ratingCount && typeof req.query.ratingCount === 'object') {
      for (const k of Object.keys(req.query.ratingCount)) {
        const star = parseInt(k, 10);
        const val = parseInt(req.query.ratingCount[k], 10);
        if (!Number.isNaN(star) && !Number.isNaN(val)) ratingCountFilters[star] = val;
      }
    }

    // New: Multi-select rating filter (e.g. rating=3,4,5) checks average rating floor
    let ratingArray = null;
    if (req.query.rating) {
      ratingArray = req.query.rating.split(",").map(r => parseInt(r.trim(), 10)).filter(n => !Number.isNaN(n));
    }

    const hasReviewFilters = (minAvgRating !== null) || (minReviewCount !== null) || Object.keys(ratingCountFilters).length > 0 || (ratingArray && ratingArray.length > 0);
    if (hasReviewFilters) {
      // Build aggregation attributes
      const reviewAttrs = [
        'productId',
        [fn('AVG', col('rating')), 'avgRating'],
        [fn('COUNT', col('rating')), 'reviewCount'],
      ];
      for (const starStr of Object.keys(ratingCountFilters)) {
        const star = parseInt(starStr, 10);
        // SUM(CASE WHEN rating = X THEN 1 ELSE 0 END) as rating_X_count
        reviewAttrs.push([
          fn('SUM', literal(`CASE WHEN rating = ${star} THEN 1 ELSE 0 END`)),
          `rating_${star}_count`,
        ]);
      }

      const aggregated = await ProductReview.findAll({
        attributes: reviewAttrs,
        group: ['productId'],
      });

      const matchingFromReviews = aggregated.filter((r) => {
        const dv = r.toJSON();
        const avg = parseFloat(dv.avgRating || 0);

        if (ratingArray && ratingArray.length > 0) {
          const floorAvg = Math.floor(avg);
          // If user selects 4, it matches 4.0 to 4.9.
          // If 5, matches 5.0. 
          // If the product has 0 reviews (avg 0), floor is 0.
          if (!ratingArray.includes(floorAvg)) return false;
        }

        if (minAvgRating !== null) {
          if (avg < minAvgRating) return false;
        }
        if (minReviewCount !== null) {
          const cnt = parseInt(dv.reviewCount || 0, 10);
          if (cnt < minReviewCount) return false;
        }
        for (const starStr of Object.keys(ratingCountFilters)) {
          const star = parseInt(starStr, 10);
          const needed = ratingCountFilters[star];
          const have = parseInt(dv[`rating_${star}_count`] || 0, 10);
          if (have < needed) return false;
        }
        return true;
      }).map((r) => r.productId);

      if (!matchingFromReviews.length) {
        return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: parseInt(req.query.limit) || 10, totalPages: 0 } });
      }

      // Apply as additional where clause (intersect with existing id filter if any)
      if (whereClause.id && whereClause.id[Op.in]) {
        // intersect two arrays
        const existingIds = whereClause.id[Op.in];
        const intersect = existingIds.filter((id) => matchingFromReviews.includes(id));
        whereClause.id = { [Op.in]: intersect };
      } else {
        whereClause.id = { [Op.in]: matchingFromReviews };
      }
    }

    // --- Stock-based filtering (inStock=true|false) ---
    if (req.query.inStock !== undefined) {
      const wantInStock = String(req.query.inStock).toLowerCase() === 'true';

      // Aggregate inventory totals per product
      const invAgg = await ProductInventory.findAll({
        attributes: [
          'productId',
          [fn('SUM', col('availableQuantity')), 'totalQty'],
        ],
        group: ['productId'],
      });

      const invMap = invAgg.reduce((acc, row) => {
        const v = row.toJSON();
        acc[v.productId] = parseInt(v.totalQty || 0, 10);
        return acc;
      }, {});

      const invIds = Object.keys(invMap).map((s) => Number(s));

      let matchingStockIds = [];
      if (wantInStock) {
        // products whose summed availableQuantity > 0
        matchingStockIds = invIds.filter((id) => invMap[id] > 0);
      } else {
        // out-of-stock: include products with sum == 0 AND products with no inventory rows
        const zeroIds = invIds.filter((id) => invMap[id] === 0);
        // products without any inventory rows
        const noInvWhere = invIds.length ? { id: { [Op.notIn]: invIds } } : {};
        const noInvProducts = await Product.findAll({ where: noInvWhere, attributes: ['id'] });
        const noInvIds = noInvProducts.map((p) => p.id);
        matchingStockIds = [...zeroIds, ...noInvIds];
      }

      if (!matchingStockIds.length) {
        return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: parseInt(req.query.limit) || 10, totalPages: 0 } });
      }

      // intersect with existing id filter if present
      if (whereClause.id && whereClause.id[Op.in]) {
        const existingIds = whereClause.id[Op.in];
        const intersect = existingIds.filter((id) => matchingStockIds.includes(id));
        whereClause.id = { [Op.in]: intersect };
      } else {
        whereClause.id = { [Op.in]: matchingStockIds };
      }
    }

    // Build a JSON_OVERLAPS where expression for size JSON column (MySQL 8+).
    // Use Sequelize `where(fn(...), true)` to ensure the condition is placed
    // correctly in the generated SQL rather than a raw literal that may
    // reference aliases before they're defined.
    let productSizeWhereExpr;
    if (productSizeArray && productSizeArray.length) {
      const jsonSizes = JSON.stringify(productSizeArray);
      productSizeWhereExpr = where(
        fn("JSON_OVERLAPS", col("productSize.size"), literal(`'${jsonSizes}'`)),
        true
      );
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
          // apply inventory-level where using resolved variation ids
          where: (function () {
            const w = {};
            if (matchingColorIds && matchingColorIds.length) w.productColorVariationId = { [Op.in]: matchingColorIds };
            if (matchingSizeIds && matchingSizeIds.length) w.productSizeVariationId = { [Op.in]: matchingSizeIds };
            return Object.keys(w).length ? w : undefined;
          })(),
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
          required: !!((matchingColorIds && matchingColorIds.length) || (matchingSizeIds && matchingSizeIds.length)),
        },
      ],
      // group: ["Product.id"],
      subQuery: false,
      order: [[sort, sortingOrder]],
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

      // If a size filter was requested, reduce each inventory's productSize.size
      // to only the intersection with the requested sizes so the response shows
      // only the matched sizes (e.g. ["S","M","L","XL"] -> ["M","L"]).
      try {
        if (
          Array.isArray(data.inventories) &&
          data.inventories.length &&
          productSizeArray &&
          productSizeArray.length
        ) {
          data.inventories = data.inventories.map((inv) => {
            if (inv && inv.productSize && inv.productSize.size) {
              let sizes = inv.productSize.size;
              if (typeof sizes === "string") {
                try {
                  sizes = JSON.parse(sizes);
                } catch (e) {
                  sizes = [];
                }
              }
              if (Array.isArray(sizes)) {
                const filtered = sizes.filter((s) =>
                  productSizeArray.includes(String(s))
                );
                inv.productSize.size = filtered;
              }
            }
            return inv;
          });
        }
      } catch (err) {
        // non-fatal: leave sizes unchanged on error
        console.warn("Failed to filter product sizes in response:", err);
      }

      return data;
    });

    let count = 0;
    if (!newArrival) {
      // If color/size filters are used they are applied via includes, so count must
      // account for those joins. Use distinct count on product id when includes exist.
      const hasInventoryFilter =
        (productColorArray && productColorArray.length) ||
        (productSizeArray && productSizeArray.length);

      if (hasInventoryFilter) {
        const countOptions = {
          where: whereClause,
          include: queryOptions.include,
          distinct: true,
          col: "id",
        };
        count = await Product.count(countOptions);
      } else {
        count = await Product.count({ where: whereClause });
      }
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
        fitTypeId: parsedApparelDetails.fitTypeId || parsedApparelDetails.fitType,
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

    let parsedApparelDetails = {};
    try {
      parsedApparelDetails =
        typeof aparelDetials === "string"
          ? JSON.parse(aparelDetials)
          : aparelDetials || {};
    } catch (err) {
      console.warn("Invalid aparelDetials JSON in update:", aparelDetials);
    }

    await Product.update(
      {
        name,
        description,
        metaTitle,
        metaDescription,
        careInstructions,
        categoryId: categoryId || undefined,
        subCategoryId: subCategoryId || undefined,
        childCategoryId: childCategoryId || undefined,
        productMaterialId: parsedApparelDetails.productMaterialId,
        fitTypeId: parsedApparelDetails.fitTypeId || parsedApparelDetails.fitType,
        occasionId: parsedApparelDetails.occasionId,
        seasonal: parsedApparelDetails.seasonal,
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
  updateInventory,
};
