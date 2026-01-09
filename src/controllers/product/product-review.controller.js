const ProductReview = require("../../models/product/product-review");
const Product = require("../../models/product/product.model");
const Customer = require("../../models/customer/customers.model");
const path = require("path");
const fs = require("fs");

exports.createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const customerId = req.user.id;

    if (!productId || !/^\d+$/.test(productId)) {
      return res.status(400).json({
        success: false,
        message: "Valid productId is required"
      });
    }

    const parsedRating = parseInt(rating, 10);
    if (!parsedRating || isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a number between 1 and 5"
      });
    }

    
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Check if customer has already reviewed this product
    const existingReview = await ProductReview.findOne({
      where: { productId, customerId }
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this product"
      });
    }

    // Handle image uploads
    let imagePaths = [];
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map(file => file.filename);
    }

    const review = await ProductReview.create({
      productId,
      customerId,
      rating: parsedRating,
      comment: comment && typeof comment === 'string' ? comment.trim() : null,
      images: imagePaths
    });

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review
    });
  } catch (error) {
    console.error("Create Review Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while creating review"
    });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const customerId = req.user.id; // Get the authenticated user's ID

    const reviews = await ProductReview.findAll({
      where: { customerId }, // Filter reviews by the current user
      include: [
        {
          model: Product,
          attributes: ["id", "name", "thumbnailImage"]
        },
        {
          model: Customer,
          attributes: ["id", "name", "email"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error("Get All Reviews Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching reviews"
    });
  }
};

exports.getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const {
      rating,
      minRating,
      maxRating,
      hasImages,
      search,
      page = 1,
      limit = 10,
      sortBy = "newest",
      // New: ratingCount filter → { "5": "10", "4": "5", ... }
      ratingCount
    } = req.query;

    if (!/^\d+$/.test(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format"
      });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Parse ratingCount filter: ratingCount[5]=10 → require at least 10 five-star reviews
    let ratingCountConditions = null;
    if (ratingCount && typeof ratingCount === 'object') {
      const conditions = [];
      for (const [star, minCountStr] of Object.entries(ratingCount)) {
        const starNum = parseInt(star, 10);
        const minCount = parseInt(minCountStr, 10);

        if (starNum >= 1 && starNum <= 5 && !isNaN(minCount) && minCount >= 0) {
          conditions.push({
            rating: starNum,
            '$review_count$': { [Op.gte]: minCount }
          });
        }
      }

      if (conditions.length > 0) {
        // Subquery: Count reviews per rating
        ratingCountConditions = {
          [Op.and]: conditions.map(cond => ({
            [Op.exists]: {
              from: `(SELECT rating, COUNT(*) as review_count 
                     FROM "ProductReviews" 
                     WHERE "productId" = ${productId} 
                     GROUP BY rating 
                     HAVING rating = ${cond.rating} AND COUNT(*) >= ${cond['$review_count$'][Op.gte]}) as sub`
            }
          }))
        };

        // Simpler & safer way using HAVING in main query via attributes + group
        // We'll do pre-check using raw query
        const ratingCounts = await ProductReview.findAll({
          where: { productId },
          attributes: ['rating', [ProductReview.sequelize.fn('COUNT', ProductReview.sequelize.col('rating')), 'count']],
          group: ['rating'],
          raw: true
        });

        const countMap = {};
        ratingCounts.forEach(r => { countMap[r.rating] = parseInt(r.count); });

        const failed = Object.entries(ratingCount).some(([star, minStr]) => {
          const s = parseInt(star);
          const min = parseInt(minStr);
          return s >= 1 && s <= 5 && (countMap[s] || 0) < min;
        });

        if (failed) {
          // If any required rating count not met → return empty result
          return res.status(200).json({
            success: true,
            data: {
              reviews: [],
              pagination: { total: 0, page: 1, limit, totalPages: 0 },
              stats: { totalReviews: 0, averageRating: 0, ratingDistribution: {1:0,2:0,3:0,4:0,5:0} }
            }
          });
        }
      }
    }

    // Build main where clause
    const whereClause = { productId };

    // Existing filters...
    if (rating) {
      const r = parseInt(rating, 10);
      if (isNaN(r) || r < 1 || r > 5) return res.status(400).json({ success: false, message: "rating must be 1-5" });
      whereClause.rating = r;
    }
    if (minRating) {
      const min = parseInt(minRating, 10);
      if (isNaN(min) || min < 1 || min > 5) return res.status(400).json({ success: false, message: "minRating invalid" });
      whereClause.rating = { ...(whereClause.rating || {}), [Op.gte]: min };
    }
    if (maxRating) {
      const max = parseInt(maxRating, 10);
      if (isNaN(max) || max < 1 || max > 5) return res.status(400).json({ success: false, message: "maxRating invalid" });
      whereClause.rating = { ...(whereClause.rating || {}), [Op.lte]: max };
    }
    if (hasImages !== undefined) {
      const wants = hasImages === "true";
      whereClause.images = wants
        ? { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: [] }] }
        : { [Op.or]: [null, []] };
    }
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      whereClause[Op.or] = [
        { comment: { [Op.iLike]: term } },
        { "$Customer.name$": { [Op.iLike]: term } }
      ];
    }

    // Pagination & Sorting
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    let order = [["createdAt", "DESC"]];
    switch (sortBy) {
      case "oldest": order = [["createdAt", "ASC"]]; break;
      case "highest": order = [["rating", "DESC"], ["createdAt", "DESC"]]; break;
      case "lowest": order = [["rating", "ASC"], ["createdAt", "DESC"]]; break;
    }

    const { count, rows: reviews } = await ProductReview.findAndCountAll({
      where: whereClause,
      include: [{ model: Customer, attributes: ["id", "name", "email"] }],
      order,
      limit: limitNum,
      offset,
      distinct: true
    });

    // Stats
    const totalRatingSum = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = reviews.length > 0 ? parseFloat((totalRatingSum / reviews.length).toFixed(1)) : 0;

    const ratingDistribution = reviews.reduce((acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    // Format image URLs
    const baseUrl = `${req.protocol}://${req.get("host")}/uploads/`;
    const formattedReviews = reviews.map(review => {
      const data = review.toJSON();
      if (data.images?.length > 0) {
        data.images = data.images.map(img => `${baseUrl}${img}`);
      } else data.images = [];
      return data;
    });

    res.status(200).json({
      success: true,
      data: {
        reviews: formattedReviews,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum),
          hasNext: pageNum < Math.ceil(count / limitNum),
          hasPrev: pageNum > 1
        },
        stats: {
          totalReviews: count,
          averageRating,
          ratingDistribution
        }
      }
    });

  } catch (error) {
    console.error("Get Reviews By Product Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message
    });
  }
};

exports.getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID format"
      });
    }

    const review = await ProductReview.findByPk(id, {
      include: [
        {
          model: Product,
          attributes: ["id", "name", "thumbnailImage"]
        },
        {
          model: Customer,
          attributes: ["id", "name", "email"]
        }
      ]
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    res.status(200).json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error("Get Review By Id Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching review"
    });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const customerId = req.user.id;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID format"
      });
    }

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

  
    if (review.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own reviews"
      });
    }

    if (rating !== undefined) {
      const parsedRating = parseInt(rating, 10);
      if (!parsedRating || isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be a number between 1 and 5 if provided"
        });
      }
      review.rating = parsedRating;
    }

    if (comment !== undefined) {
      if (typeof comment !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Comment must be a string if provided"
        });
      }
      review.comment = comment.trim() || null;
    }

    // Handle image updates
    if (req.files && req.files.length > 0) {
      // Delete old images if they exist
      if (review.images && review.images.length > 0) {
        review.images.forEach(image => {
          const imagePath = path.join(__dirname, '../../../uploads', image);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
      }
      // Set new images
      review.images = req.files.map(file => file.filename);
    }

    await review.save();


    const updatedReview = await ProductReview.findByPk(id, {
      include: [
        {
          model: Product,
          attributes: ["id", "name", "thumbnailImage"]
        },
        {
          model: Customer,
          attributes: ["id", "name", "email"]
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: updatedReview
    });
  } catch (error) {
    console.error("Update Review Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while updating review"
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID format"
      });
    }

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    if (review.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews"
      });
    }

    // Delete associated images
    if (review.images && review.images.length > 0) {
      review.images.forEach(image => {
        const imagePath = path.join(__dirname, '../../../uploads', image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });
    }

    await review.destroy();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    console.error("Delete Review Error:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: "Cannot delete review due to related records"
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while deleting review"
    });
  }
};