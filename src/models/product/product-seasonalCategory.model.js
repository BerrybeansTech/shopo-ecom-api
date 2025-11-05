const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ProductSeasonalCategory = sequelize.define('ProductSeasonalCategory', {
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
  tableName: 'ProductSeasonalCategory',
  timestamps: true
});

module.exports = ProductSeasonalCategory;
