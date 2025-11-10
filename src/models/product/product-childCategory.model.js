// product-childCategory.model.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ProductChildCategory = sequelize.define('ProductChildCategory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  subCategoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ProductSubCategory',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM("active", "inactive", "deleted"),
    defaultValue: "active"
  }
}, {
  tableName: 'ProductChildCategory',
  timestamps: true,
});

module.exports = ProductChildCategory;
