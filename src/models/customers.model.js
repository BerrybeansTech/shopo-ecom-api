

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Customers = sequelize.define('Customers', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true, 
    validate: {
      isEmail: true,
    },
  },

  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  googleAuthToken: {
    type: DataTypes.TEXT,
    allowNull: true, 
  },

  password: {
    type: DataTypes.TEXT,
    allowNull: true, 
  },

  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  city: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  state: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  country: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  postalCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  status: {
    type: DataTypes.ENUM('active', 'inactive', 'blocked'),
    defaultValue: 'active',
  },

  // loyaltyPoints: {
  //   type: DataTypes.INTEGER,
  //   defaultValue: 0,
  //   allowNull: true,
  // },

  // giftCardCode: {
  //   type: DataTypes.STRING,
  //   allowNull: true,
  // },

  // giftCardBalance: {
  //   type: DataTypes.DECIMAL(10, 2),
  //   allowNull: true,
  //   defaultValue: 0.00,
  // },

}, {
  tableName: 'Customers',
  timestamps: true,
});

module.exports = Customers;
