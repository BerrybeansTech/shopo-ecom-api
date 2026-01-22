const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

module.exports = sequelize.define('comboOffer', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  childCategoryId: {
    type: DataTypes.INTEGER,
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  Description: { 
    type: DataTypes.TEXT
  },
  bannerImage: {
    type: DataTypes.JSON
  },
  eligibleAmount: {
    type: DataTypes.INTEGER,
  },
  offerAmount: {
    type: DataTypes.INTEGER,
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status:  {
    type: DataTypes.ENUM("active", "inactive", "deleted"),
    defaultValue: "active",
  }

}, {
  tableName: 'comboOffer',
  timestamps: true,
});


