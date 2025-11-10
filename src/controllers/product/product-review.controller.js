const ProductReview = require("../../models/product/product-review");
const Product = require("../../models/product/product.model");
const Customer = require("../../models/customer/customers.model");

exports.createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const customerId = req.user.id; // Assuming JWT middleware sets req.user

    if (!productId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Product ID and rating are required"
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
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

    const review = await ProductReview.create({
      productId,
      customerId,
      rating,
      comment
    });

    res.status(201).json({
      success: true,
      message: "Review created successfully",
      data: review
    });
  } catch (error) {
    console.error("Create Review Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await ProductReview.findAll({
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
      message: error.message
    });
  }
};

exports.getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await ProductReview.findAll({
      where: { productId },
      include: [
        {
          model: Customer,
          attributes: ["id", "name", "email"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: {
        reviews,
        totalReviews: reviews.length,
        averageRating: parseFloat(averageRating)
      }
    });
  } catch (error) {
    console.error("Get Reviews By Product Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getReviewById = async (req, res) => {
  try {
    const { id } = req.params;

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
      message: error.message
    });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const customerId = req.user.id;

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    // Check if the review belongs to the authenticated customer
    if (review.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own reviews"
      });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    review.rating = rating || review.rating;
    review.comment = comment !== undefined ? comment : review.comment;

    await review.save();

    res.status(200).json({
      success: true,
      message: "Review updated successfully",
      data: review
    });
  } catch (error) {
    console.error("Update Review Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    const review = await ProductReview.findByPk(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    // Check if the review belongs to the authenticated customer
    if (review.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own reviews"
      });
    }

    await review.destroy();

    res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    console.error("Delete Review Error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
