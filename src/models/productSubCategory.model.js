const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const productSubCategory = sequelize.define('productSubCategory', {
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
      model: 'Category',
      key: 'id'
    }
  }
}, {
  tableName: 'productSubCategory',
  timestamps: false
});

module.exports = productSubCategory;
