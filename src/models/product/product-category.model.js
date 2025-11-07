const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ProductCategory = sequelize.define('ProductCategory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'ProductCategory',
  timestamps: true
});

module.exports = ProductCategory;
