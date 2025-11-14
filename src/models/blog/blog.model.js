const { DataTypes } = require('sequelize');
const sequelize = require('../../config/db');

module.exports = sequelize.define('Blog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  featuredImage: {
    type: DataTypes.JSON
  },
  bannerImage: {
    type: DataTypes.JSON
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  shortDescription: {
    type: DataTypes.TEXT
  },
  metaTitle: {
    type: DataTypes.TEXT,
  },
  metaDescription: {
    type: DataTypes.TEXT,
  },
  content: {
    type: DataTypes.TEXT("long"),
    allowNull: false,
  },
  slug: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status:  {
    type: DataTypes.ENUM("active", "inactive", "deleted"),
    defaultValue: "active",
  }

}, {
  tableName: 'Blog',
  timestamps: true,
});


