const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const Orders = require('./order.model');
const Customers = require('../customer/customers.model');

const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Orders,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },

  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Customers,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },

  invoiceNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    autoIncrement: true,
  },

  invoiceFile: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Path or URL of generated invoice PDF file',
  },
}, {
  tableName: 'Invoices',
  timestamps: true,
});

module.exports = Invoice;
