const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); 

module.exports = sequelize.define('support', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('general', 'customer'),
    defaultValue: "general",
  },
  status: {
    type: DataTypes.ENUM('pending', 'marked', 'resolved', 'spam'),
    defaultValue: "pending",
  },

}, {
  tableName: 'support',
  timestamps: true,
});


