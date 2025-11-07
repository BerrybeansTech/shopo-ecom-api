const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const ProductCategory = require("./product-category.model")

const ProductSizeChart = sequelize.define('ProductSizeChart', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ProductCategory,
      key: 'id'
    }
  },
  image: {
    type: DataTypes.JSON,
    allowNull: false
  },
}, {
  tableName: 'ProductSizeChart',
  timestamps: false
});

module.exports = ProductSizeChart;
