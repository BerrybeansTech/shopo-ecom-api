const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const Customer = require('../customer/customers.model');

const Orders = sequelize.define('Orders', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  totalItems: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  subTotal: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  tax: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  shippingCharge: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  totalAmount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  finalAmount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'pending-refund', 'refunded'),
    defaultValue: 'pending',
  },
  orderNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'shipped', 'delivered', 'cancelled', 'returned'),
    defaultValue: 'pending',
  }
}, {
  tableName: 'Orders',
  timestamps: true,
});

module.exports = Orders;
