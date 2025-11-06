const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const ProductOccasion = sequelize.define('ProductOccasion', {
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
  tableName: 'ProductOccasion',
  timestamps: true
});

module.exports = ProductOccasion;
