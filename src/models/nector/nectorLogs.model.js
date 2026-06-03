const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

const NectorLogs = sequelize.define('NectorLogs', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  customer_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  event_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  response: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
  }
}, {
  tableName: 'nector_logs',
  timestamps: true,
});

module.exports = NectorLogs;
