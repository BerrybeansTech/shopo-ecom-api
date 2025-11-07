// src/models/product/product-sizeVariation.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const productSizeVariation = sequelize.define('productSizeVariation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('topwear', 'bottomwear'),
    allowNull: false
  },
  size: {
    type: DataTypes.JSON,
    allowNull: false
  }
}, {
  tableName: 'productSizeVariation',
  timestamps: false
});

module.exports = productSizeVariation;
