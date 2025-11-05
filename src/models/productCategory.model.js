const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const productCategory = sequelize.define('productCategory', {
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
  tableName: 'productCategory',
  timestamps: false
});

module.exports = productCategory;
