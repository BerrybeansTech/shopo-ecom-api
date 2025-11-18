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
      message: "Internal server error occurred while fetching product reviews"
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