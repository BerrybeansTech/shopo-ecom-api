const ProductSizeChart = require("../../models/product/product-sizeChart.model");
const ProductCategory = require("../../models/product/product-category.model");
const path = require("path");
const fs = require("fs");

const getAllSizeCharts = async (req, res) => {
  try {
    const sizeCharts = await ProductSizeChart.findAll({
      include: [
        {
          model: ProductCategory,
          attributes: ['id', 'name']
        } 
      ],
      order: [["id", "ASC"]]
    });

    const baseUrl = `${req.protocol}://${req.get("host")}/`;

    const updatedSizeCharts = sizeCharts.map((chart) => {
      const data = chart.toJSON();
      if (Array.isArray(data.image)) {
        data.image = data.image.map((imgPath) => `${baseUrl}${imgPath}`);
      }
      return data;
    });

    res.status(200).json({
      success: true,
      data: updatedSizeCharts
    });
  } catch (error) {
    console.error("Get All Size Charts Error:", error);
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({
        success: false,
        message: "Database error occurred while fetching size charts"
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching size charts"
    });
  }
};

const getSizeChartById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid size chart ID format"
      });
    }

    const sizeChart = await ProductSizeChart.findByPk(id, {
      include: [
        {
          model: ProductCategory,
          attributes: ['id', 'name']
        }
      ]
    });

    if (!sizeChart) {
      return res.status(404).json({
        success: false,
        message: "Size chart not found"
      });
    }

    const baseUrl = `${req.protocol}://${req.get("host")}/`;
    const data = sizeChart.toJSON();
    if (Array.isArray(data.image)) {
      data.image = data.image.map((imgPath) => `${baseUrl}${imgPath}`);
    }

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error("Get Size Chart By Id Error:", error);
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(500).json({
        success: false,
        message: "Database error occurred while fetching size chart"
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while fetching size chart"
    });
  }
};

const createSizeChart = async (req, res) => {
  try {
    const { categoryId } = req.body;

    if (categoryId && !/^\d+$/.test(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Valid categoryId is required if provided"
      });
    }


    if (categoryId) {
      const category = await ProductCategory.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }
    }

 
    let image = [];

    if (!req.files?.image || req.files.image.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one image is required"
      });
    }

    image = req.files.image.map(file => `${process.env.FILE_PATH}${file.filename}`);

    const sizeChart = await ProductSizeChart.create({
      categoryId,
      image
    });

    
    const baseUrl = `${req.protocol}://${req.get("host")}/`;
    const data = sizeChart.toJSON();
    if (Array.isArray(data.image)) {
      data.image = data.image.map((imgPath) => `${baseUrl}${imgPath}`);
    }

    res.status(201).json({
      success: true,
      message: "Size chart created successfully",
      data: data
    });
  } catch (error) {
    console.error("Create Size Chart Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message
      });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: "Size chart already exists for this category"
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while creating size chart"
    });
  }
};

const updateSizeChart = async (req, res) => {
  try {
    const { id } = req.params;
    let { categoryId, oldImage = [] } = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid size chart ID format"
      });
    }

    if (categoryId && !/^\d+$/.test(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Valid categoryId is required if provided"
      });
    }

    const existing = await ProductSizeChart.findByPk(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Size chart not found"
      });
    }

    if (categoryId) {
      const category = await ProductCategory.findByPk(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }
    }

   
    if (typeof oldImage === "string") {
      try {
        oldImage = JSON.parse(oldImage);
      } catch (err) {
        console.error("Error parsing oldImage:", err);
        oldImage = [];
      }
    }

    
    oldImage = Array.isArray(oldImage) ? oldImage.map((img) => {
      const uploadIndex = img.indexOf("uploads/");
      return uploadIndex !== -1 ? img.slice(uploadIndex) : img;
    }) : [];

    let image = [...oldImage];

  
    const removedImages = (existing.image || []).filter(
      (img) => !oldImage.includes(img)
    );

    for (const img of removedImages) {
      try {
        const oldImagePath = path.join(__dirname, "..", "..", img);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      } catch (fsError) {
        console.error("Error deleting image file:", fsError);

      }
    }

    if (req.files?.image && req.files.image.length > 0) {
      const newImages = req.files.image.map(file => `${process.env.FILE_PATH}${file.filename}`);
      image = [...image, ...newImages];
    }

    await ProductSizeChart.update(
      {
        categoryId: categoryId || existing.categoryId,
        image
      },
      { where: { id } }
    );


    const updatedSizeChart = await ProductSizeChart.findByPk(id, {
      include: [
        {
          model: ProductCategory,
          attributes: ['id', 'name']
        }
      ]
    });

    const baseUrl = `${req.protocol}://${req.get("host")}/`;
    const data = updatedSizeChart.toJSON();
    if (Array.isArray(data.image)) {
      data.image = data.image.map((imgPath) => `${baseUrl}${imgPath}`);
    }

    res.status(200).json({
      success: true,
      message: "Size chart updated successfully",
      data: data
    });
  } catch (error) {
    console.error("Update Size Chart Error:", error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while updating size chart"
    });
  }
};

const deleteSizeChart = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid size chart ID format"
      });
    }

    const sizeChart = await ProductSizeChart.findByPk(id);

    if (!sizeChart) {
      return res.status(404).json({
        success: false,
        message: "Size chart not found"
      });
    }

   
    if (Array.isArray(sizeChart.image)) {
      sizeChart.image.forEach((imgPath) => {
        try {
          const fullPath = path.join(__dirname, "..", "..", imgPath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (fsError) {
          console.error("Error deleting image file:", fsError);
        
        }
      });
    }

    await ProductSizeChart.destroy({ where: { id } });

    res.status(200).json({
      success: true,
      message: "Size chart deleted successfully"
    });
  } catch (error) {
    console.error("Delete Size Chart Error:", error);
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: "Cannot delete size chart due to related records"
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error occurred while deleting size chart"
    });
  }
};

module.exports = {
  getAllSizeCharts,
  getSizeChartById,
  createSizeChart,
  updateSizeChart,
  deleteSizeChart
};