// models/CartItem.js
const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const Cart = require("./cart.model");
const Product = require("../product/product.model");
const ProductColorVariation = require("../product/product-colorVariation.model")
const ProductSizeVariation = require("../product/product-sizeVariation.model")

const CartItem = sequelize.define(
  "CartItem",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    cartId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Cart,
        key: "id",
      },
      onDelete: "CASCADE",
    },
    productId: {
      type: DataTypes.INTEGER,
      references: {
        model: Product,
        key: "id",
      },
    },
    productColorVariationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ProductColorVariation,
        key: "id",
      },
    },
    productSizeVariationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ProductSizeVariation,
        key: "id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "CartItems",
    timestamps: true,
  }
);

module.exports = CartItem;
