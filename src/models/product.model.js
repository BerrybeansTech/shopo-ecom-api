const { DataTypes } = require('sequelize');
const sequelize = require('../db');

module.exports = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.TEXT,
  },
  description: {
    type: DataTypes.TEXT,
  },
  // category: {
  //   type: DataTypes.TEXT,
  // },
  // subCategory: {
  //   type: DataTypes.TEXT,
  // },
  subCategoryId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  postedBy: {
    type: DataTypes.INTEGER,
  },
  thumbnailImage: {
    type: DataTypes.JSON
  },
  galleryImage: {
    type: DataTypes.JSON
  },
  price: {
    type: DataTypes.STRING
  },
  gst: {
    type: DataTypes.STRING
  },
  hsnCode: {
    type: DataTypes.STRING
  },
  priceLable: {
    type: DataTypes.STRING
  },
  brandName: {
    type: DataTypes.TEXT,
  },
  benefits: {
    type: DataTypes.TEXT,
  },
  expiresOn: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  additionalInformation: {
    type: DataTypes.JSON
  },
  totalOrders: {
    type: DataTypes.STRING,
    defaultValue: null
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true

  },
  status:  {
    type: DataTypes.ENUM("pending","approved","rejected"),
    defaultValue: "pending"
  }

}, {
  tableName: 'Product',
  timestamps: true,
});

