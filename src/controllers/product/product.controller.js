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
const OrderItems = require("../../models/orders/orderItems.model");

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
      bestSeller,
      sort = "createdAt",
      sortingOrder = "DESC"
    } = req.query;

    const host = req.get("host");
    const protocol = host.includes("localhost") ? req.protocol : "https";
    const baseUrl = `${protocol}://${host}/`;

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


    if (bestSeller) {
      const bestSelling = await OrderItems.findAll({
        attributes: [
          "productId",
          [fn("SUM", col("quantity")), "totalSold"]
        ],
        where: {
          productId: { [Op.ne]: null }
        },
        group: ["productId"],
        order: [[literal("totalSold"), "DESC"]],
        limit: 6,
      });

      const bestSellerIds = bestSelling
        .map(item => item.productId)
        .filter(Boolean); 

      if (!bestSellerIds.length) {
        return res.json({
          success: true,
          data: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
        });
      }

      whereClause.id = { [Op.in]: bestSellerIds };

      queryOptions.order = [
        [literal(`FIELD(Product.id, ${bestSellerIds.join(",")})`)]
      ];
    }
    if (newArrival) {
      queryOptions.where.status = "approved";
      queryOptions.limit = 5;
      queryOptions.order = [["createdAt", "DESC"]];
    }

    const products = await Product.findAll(queryOptions);

    const updatedProducts = products.map((product) => {
      const data = product.toJSON();

      data.thumbnailImage = data.thumbnailImage
        ? `${baseUrl}${data.thumbnailImage.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`
        : null;

      let galleryArray = [];
      if (data.galleryImage) {
        try {
          const rawGallery = Array.isArray(data.galleryImage)
            ? data.galleryImage
            : JSON.parse(data.galleryImage);
          
          galleryArray = (Array.isArray(rawGallery) ? rawGallery : [rawGallery])
            .flatMap(item => typeof item === 'string' ? item.split(',') : item)
            .filter(Boolean);
        } catch {
          galleryArray = typeof data.galleryImage === 'string' 
            ? data.galleryImage.split(',').filter(Boolean) 
            : [];
        }
      }
      if (!Array.isArray(galleryArray)) {
        galleryArray = galleryArray ? [galleryArray] : [];
      }

      data.galleryImage = galleryArray
        .filter(img => typeof img === 'string')
        .map((img) => `${baseUrl}${img.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`);
      data.averageRating = parseFloat(data.averageRating || 0).toFixed(1);
      data.reviewCount = parseInt(data.reviewCount || 0);

      // If a size filter was requested, reduce each inventory's productSize.size
      // to only the intersection with the requested sizes so the response shows
      // only the matched sizes (e.g. ["S","M","L","XL"] -> ["M","L"]).
      try {
        if (Array.isArray(data.inventories) && data.inventories.length > 0) {
          data.inventories = data.inventories.map((inv) => {
            if (inv && inv.productSize && inv.productSize.size) {
              let sizes = inv.productSize.size;
              if (typeof sizes === "string") {
                try {
                  sizes = JSON.parse(sizes);
                } catch (e) {
                  sizes = [sizes];
                }
              }

              if (Array.isArray(sizes)) {
                // If a size filter exists, filter the array; otherwise just keep it parsed
                if (productSizeArray && productSizeArray.length > 0) {
                  inv.productSize.size = sizes.filter((s) =>
                    productSizeArray.includes(String(s))
                  );
                } else {
                  inv.productSize.size = sizes;
                }
              }
            }
            return inv;
          });
        }
      } catch (err) {
        console.warn("Failed to parse product sizes in response:", err);
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

    const host = req.get("host");
    const protocol = host.includes("localhost") ? req.protocol : "https";
    const baseUrl = `${protocol}://${host}/`;

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
        const rawGallery = Array.isArray(product.galleryImage)
          ? product.galleryImage
          : JSON.parse(product.galleryImage);
        
        galleryArray = (Array.isArray(rawGallery) ? rawGallery : [rawGallery])
          .flatMap(item => typeof item === 'string' ? item.split(',') : item)
          .filter(Boolean);
      } catch (err) {
        galleryArray = typeof product.galleryImage === 'string' 
          ? product.galleryImage.split(',').filter(Boolean) 
          : [];
      }
    }

    const updatedThumbnailImage = product.thumbnailImage
      ? `${baseUrl}${product.thumbnailImage.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`
      : null;
    console.log(
      "Array.isArray(product.galleryImage)",
      Array.isArray(product.galleryImage),
      product.galleryImage
    );
    if (!Array.isArray(galleryArray)) {
      galleryArray = galleryArray ? [galleryArray] : [];
    }

    const updatedGalleryImage = galleryArray
      .filter(imgPath => typeof imgPath === 'string')
      .map((imgPath) => `${baseUrl}${imgPath.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`);

    const ratings = product.productReviews?.map((r) => r.rating) || [];
    const averageRating =
      ratings.length > 0
        ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
        : 0;

    const data = product.toJSON();

    if (Array.isArray(data.inventories)) {
      data.inventories = data.inventories.map((inv) => {
        if (inv && inv.productSize && inv.productSize.size) {
          let sizes = inv.productSize.size;
          if (typeof sizes === "string") {
            try {
              sizes = JSON.parse(sizes);
            } catch (e) {
              sizes = [sizes];
            }
          }
          inv.productSize.size = Array.isArray(sizes) ? sizes : [sizes];
        }
        return inv;
      });
    }

    const updatedProduct = {
      ...data,
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
      ? `${(process.env.FILE_PATH || "").replace(/[\\\[\]"]/g, "")}${req.files.thumbnailImage[0].filename.replace(/[\\\[\]"]/g, "")}`
      : null;

      const galleryImage = req.files?.galleryImage
      ? req.files.galleryImage.map(
        (file) => `${(process.env.FILE_PATH || "").replace(/[\\\[\]"]/g, "")}${file.filename.replace(/[\\\[\]"]/g, "")}`
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
        fitTypeId: parsedApparelDetails.fitType,
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

    const host = req.get("host");
    const protocol = host && host.includes("localhost") ? req.protocol : "https";
    const baseUrl = `${protocol}://${host}/`;

    const cleanedProduct = newProduct.toJSON();
    cleanedProduct.thumbnailImage = cleanedProduct.thumbnailImage
      ? `${baseUrl}${cleanedProduct.thumbnailImage.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`
      : null;
    
    let galleryArr = [];
    try {
      galleryArr = JSON.parse(cleanedProduct.galleryImage || "[]");
    } catch { galleryArr = []; }
    
    cleanedProduct.galleryImage = (Array.isArray(galleryArr) ? galleryArr : [])
      .map(img => `${baseUrl}${img.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: cleanedProduct,
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
  try {
    // ✅ Extract & validate ID
    const id = parseInt(req.body.id);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing product ID",
      });
    }

    let {
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

    // ✅ Convert oldGalleryImage to array
    if (typeof oldGalleryImage === "string") {
      try {
        oldGalleryImage = JSON.parse(oldGalleryImage);
      } catch {
        // ✅ Handle comma-separated strings if parse fails
        oldGalleryImage = oldGalleryImage.split(',').filter(Boolean);
      }
    }
    if (!Array.isArray(oldGalleryImage)) {
      oldGalleryImage = oldGalleryImage ? [oldGalleryImage] : [];
    }

    // ✅ Flat and split commas just in case it's ["img1,img2"]
    oldGalleryImage = oldGalleryImage
      .flatMap(item => typeof item === 'string' ? item.split(',') : item)
      .filter(Boolean);

    // ✅ Normalize paths
    oldGalleryImage = oldGalleryImage.map((img) => {
      const index = img.indexOf("uploads/");
      return index !== -1 ? img.slice(index) : img;
    });

    // ✅ Find product
    const existing = await Product.findByPk(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ✅ Convert existing galleryImage to array
    let existingGallery = existing.galleryImage || [];

    if (typeof existingGallery === "string") {
      try {
        existingGallery = JSON.parse(existingGallery);
      } catch {
        existingGallery = existingGallery.split(",");
      }
    }

    if (!Array.isArray(existingGallery)) {
      existingGallery = [];
    }

    // ✅ Start with old images
    let galleryImage = [...oldGalleryImage];

    // ✅ Find removed images
    const removedImages = existingGallery.filter(
      (img) => !oldGalleryImage.includes(img)
    );

    // ✅ Delete removed images
    for (const img of removedImages) {
      const filePath = path.join(__dirname, "..", img);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn("Failed to delete:", filePath);
        }
      }
    }

    // ✅ Add new gallery images
    if (req.files?.galleryImage?.length > 0) {
      const newImages = req.files.galleryImage.map(
        (file) => `${(process.env.FILE_PATH || "").replace(/[\\\[\]"]/g, "")}${file.filename.replace(/[\\\[\]"]/g, "")}`
      );
      galleryImage = [...galleryImage, ...newImages];
    }

    // ✅ Handle thumbnail
    let thumbnailImage = existing.thumbnailImage;

    if (req.files?.thumbnailImage?.[0]) {
      // delete old thumbnail
      if (thumbnailImage) {
        const oldThumbPath = path.join(__dirname, "..", thumbnailImage);
        if (fs.existsSync(oldThumbPath)) {
          try {
            fs.unlinkSync(oldThumbPath);
          } catch (err) {
            console.warn("Failed to delete thumbnail:", oldThumbPath);
          }
        }
      }

      thumbnailImage = `${(process.env.FILE_PATH || "").replace(/[\\\[\]"]/g, "")}${req.files.thumbnailImage[0].filename.replace(/[\\\[\]"]/g, "")}`;
    }

    // ✅ Save (store gallery as JSON string)
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
        galleryImage: JSON.stringify(galleryImage),
      },
      { where: { id } }
    );

    const host = req.get("host");
    const protocol = host && host.includes("localhost") ? req.protocol : "https";
    const baseUrl = `${protocol}://${host}/`;

    return res.json({
      success: true,
      message: "Product updated successfully",
      data: {
        id,
        thumbnailImage: thumbnailImage ? `${baseUrl}${thumbnailImage.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}` : null,
        galleryImage: galleryImage.map(img => `${baseUrl}${img.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "")}`),
      },
    });
  } catch (error) {
    console.error("Error updating Product:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update Product",
      error: error.message,
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

    // 1. Delete thumbnailImage
    if (ProductData.thumbnailImage) {
      const cleanThumbPath = typeof ProductData.thumbnailImage === "string" 
        ? ProductData.thumbnailImage.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "") 
        : "";
      if (cleanThumbPath) {
        const thumbPath = path.join(__dirname, "../../..", cleanThumbPath);
        if (fs.existsSync(thumbPath)) {
          try {
            fs.unlinkSync(thumbPath);
          } catch (err) {
            console.warn(`Failed to delete thumbnail: ${thumbPath}`, err);
          }
        }
      }
    }

    // 2. Delete galleryImage
    let gallery = [];
    if (ProductData.galleryImage) {
      try {
        gallery = typeof ProductData.galleryImage === "string" 
          ? JSON.parse(ProductData.galleryImage) 
          : ProductData.galleryImage;
      } catch {
        gallery = typeof ProductData.galleryImage === "string" ? ProductData.galleryImage.split(",") : [];
      }
    }

    if (Array.isArray(gallery)) {
      gallery.forEach((imgPath) => {
        if (typeof imgPath === "string") {
          const cleanImgPath = imgPath.replace(/[\\\[\]"]/g, "").replace(/^[\\\/]+/, "");
          if (cleanImgPath) {
            const fullPath = path.join(__dirname, "../../..", cleanImgPath);
            if (fs.existsSync(fullPath)) {
              try {
                fs.unlinkSync(fullPath);
              } catch (err) {
                console.warn(`Failed to delete gallery image: ${fullPath}`, err);
              }
            }
          }
        }
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
      error: error.message,
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
