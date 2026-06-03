const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const Customer = require('../customer/customers.model');

const Orders = sequelize.define('Orders', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
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
  shippingAddress: {
    type: DataTypes.TEXT,
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
  totalCGST: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  totalSGST: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  totalIGST: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
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
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending',
  },
  shipmentStatus: {
    type: DataTypes.ENUM('not_created', 'pending', 'pickup_scheduled', 'shipped', 'in_transit', 'delivered', 'returned', 'cancelled', 'failed'),
    defaultValue: 'not_created',
  },
  razorpayOrderId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  razorpayPaymentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  razorpaySignature: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  shipmentId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  shiprocketOrderId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  awbCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  courierName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  trackingNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  trackingUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  shiprocketResponse: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  estimatedDelivery: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  orderNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  couponCode: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  couponDiscount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  nector_synced: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned', 'complete'),
    defaultValue: 'pending',
  }
}, {
  tableName: 'Orders',
  timestamps: true,
});

module.exports = Orders;
