const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const ProductSubCategory = require("./product-subCategory.model")

const ProductChildCategory = sequelize.define('ProductChildCategory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subCategoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ProductSubCategory,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'ProductChildCategory',
  timestamps: true,
});

module.exports = ProductChildCategory;
