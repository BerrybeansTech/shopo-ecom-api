const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ProductFitType = sequelize.define('ProductFitType', {
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
  tableName: 'ProductFitType',
  timestamps: true
});

module.exports = ProductFitType;
