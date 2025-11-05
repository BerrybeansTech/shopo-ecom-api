const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Product = require("./product.model")
const ProductColorVariation = require("./product-colorVariation.model")
const ProductSizeVariation = require("./product-sizeVariation.model")

const ProductInventory = sequelize.define('ProductInventory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    }
  },
  productColorVariationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ProductColorVariation,
      key: 'id'
    }
  },
  productSizeVariationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ProductSizeVariation,
      key: 'id'
    }
  },
  availableQuantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'ProductInventory',
  timestamps: true
});

module.exports = ProductInventory;