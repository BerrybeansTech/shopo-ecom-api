const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const Customer = require('./customers.model');

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'Cart',
  timestamps: true,
});

module.exports = Cart;
