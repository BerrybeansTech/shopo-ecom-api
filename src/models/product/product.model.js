const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const ProductCategory = require("./product-category.model")
const ProductSubCategory = require("./product-subCategory.model")
const ProductChildCategory = require("./product-childCategory.model")
const ProductOccasion = require("./product-Occasion.model")
const ProductMaterial = require("./product-material.model")

module.exports = sequelize.define('Product', {
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
    references: {
      model: ProductCategory,
      key: 'id'
    }
  },
  subCategoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ProductSubCategory,
      key: 'id'
    }
  },
  childCategoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ProductChildCategory,
      key: 'id'
    }
  },
  OccasionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Occasion,
      key: 'id'
    }
  },
  productMaterialId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ProductMaterial,
      key: 'id'
    }
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
  status:  {
    type: DataTypes.ENUM("active","inactive","deleted"),
    defaultValue: "active"
  }

}, {
  tableName: 'Product',
  timestamps: true,
});

