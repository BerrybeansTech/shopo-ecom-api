// product.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

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
  fitType: {
    type: DataTypes.TEXT,
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  subCategoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  childCategoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  OccasionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  productMaterialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
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