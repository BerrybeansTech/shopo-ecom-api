const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const ProductCategory = require("./product-category.model")

const ProductSubCategory = sequelize.define('ProductSubCategory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ProductCategory,
      key: 'id'
    }
  }
}, {
  tableName: 'ProductSubCategory',
  timestamps: false
});

module.exports = ProductSubCategory;
