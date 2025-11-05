const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const productSizeVariation = sequelize.define('productSizeVariation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  size: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'productSizeVariation',
  timestamps: false
});

module.exports = productSizeVariation;
