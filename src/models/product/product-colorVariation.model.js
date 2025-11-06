const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const productColorVariation = sequelize.define('productColorVariation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'productColorVariation',
  timestamps: false
});

module.exports = productColorVariation;
