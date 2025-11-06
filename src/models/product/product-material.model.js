const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ProductMaterial = sequelize.define('ProductMaterial', {
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
  tableName: 'ProductMaterial',
  timestamps: true
});

module.exports = ProductMaterial;
