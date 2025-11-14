// product.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const ProductCategory = require("./product-category.model")
const ProductSubCategory = require("./product-subCategory.model")
const ProductChildCategory = require("./product-childCategory.model")
const ProductOccasion = require("./product-Occasion.model");
const ProductMaterial = require('./product-material.model');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.TEXT,
  },
  description: {
    type: DataTypes.TEXT,
  },
  metaTitle: {
    type: DataTypes.TEXT,
  },
  metaDescription: {
    type: DataTypes.TEXT,
  },
  careInstructions: {
    type: DataTypes.TEXT,
  },
  fitTypeId: {
    type: DataTypes.INTEGER,
  },
  seasonal: {
    type: DataTypes.TEXT,
  },
  thumbnailImage: {
    type: DataTypes.JSON
  },
  galleryImage: {
    type: DataTypes.JSON
  },
  mrp: {
    type: DataTypes.FLOAT
  },
  sellingPrice: {
    type: DataTypes.FLOAT
  },
  gst: {
    type: DataTypes.FLOAT
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM("active", "inactive", "deleted"),
    defaultValue: "active"
  }
}, {
  tableName: 'Product',
  timestamps: true,
});

module.exports = Product;