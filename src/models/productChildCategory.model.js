const { DataTypes } = require('sequelize');
const sequelize = require('../db');

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
      model: "ProductSubCategory",
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'productChildCategory',
  timestamps: false,
});

module.exports = ProductChildCategory;
