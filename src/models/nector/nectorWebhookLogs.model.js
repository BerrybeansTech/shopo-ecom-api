const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const NectorWebhookLogs = sequelize.define('NectorWebhookLogs', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  event_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  }
}, {
  tableName: 'nector_webhook_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = NectorWebhookLogs;
