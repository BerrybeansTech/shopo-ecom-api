

const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');
const Cart = require("./cart.model");

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
    allowNull: true,
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

  loginType: {
    type: DataTypes.ENUM('local', 'google'),
    defaultValue: 'local',
  },

  profilePicture: {
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
  wishList: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  status: {
    type: DataTypes.ENUM('active', 'inactive', 'blocked'),
    defaultValue: 'active',
  },

  customer_uuid: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
  },

  nector_lead_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

}, {
  tableName: 'Customers',
  timestamps: true,
  hooks: {
    beforeValidate: (customer) => {
      if (!customer.customer_uuid) {
        const crypto = require('crypto');
        customer.customer_uuid = `USR_${crypto.randomUUID()}`;
      }
    }
  }
});

module.exports = Customers;
