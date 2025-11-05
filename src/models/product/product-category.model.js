const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProductCategory = sequelize.define('ProductCategory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'ProductCategory',
  timestamps: true
});

module.exports = ProductCategory;
