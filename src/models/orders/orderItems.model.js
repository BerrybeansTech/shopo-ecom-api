const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const Customer = require("../customer/customers.model");

const OrderItems = sequelize.define(
  "OrderItems",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    productId: {
      type: DataTypes.INTEGER,
    },
    productName: {
      type: DataTypes.TEXT,
    },
    productcolor: {
      type: DataTypes.TEXT,
    },
    size: {
      type: DataTypes.TEXT,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    unitPrice: {
      type: DataTypes.INTEGER,
    },
    totalPrice: {
      type: DataTypes.BIGINT,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "OrderItems",
    timestamps: true,
  }
);

module.exports = OrderItems;
