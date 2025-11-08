const Customer = require("../models/customer/customers.model");
const Product = require("../models/product/product.model");
const ProductCategory = require("../models/product/product-category.model");
const ProductSubCategory = require("../models/product/product-subCategory.model");
const ProductChildCategory = require("../models/product/product-childCategory.model");
const ProductOccasion = require("../models/product/product-Occasion.model");
const ProductMaterial = require("../models/product/product-material.model");
const ProductInventory = require("../models/product/product-inventory.model");
const ProductColorVariation = require("../models/product/product-colorVariation.model");
const ProductSizeVariation = require("../models/product/product-sizeVariation.model");
const ProductSizeChart = require("../models/product/product-sizeChart.model");
const Cart = require("../models/customer/cart.model");
const CartItems = require("../models/customer/cartItems.model");

// ProductCategory → ProductSubCategory (One-to-Many)
ProductCategory.hasMany(ProductSubCategory, {
  foreignKey: "categoryId",
  as: "ProductSubCategories",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductSubCategory.belongsTo(ProductCategory, {
  foreignKey: "categoryId",
  as: "ProductCategory",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// ProductSubCategory → ProductChildCategory (One-to-Many)
ProductSubCategory.hasMany(ProductChildCategory, {
  foreignKey: "subCategoryId",
  as: "ProductChildCategories",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductChildCategory.belongsTo(ProductSubCategory, {
  foreignKey: "subCategoryId",
  as: "ProductSubCategory",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Product → ProductCategory
Product.belongsTo(ProductCategory, {
  foreignKey: "categoryId",
  as: "category",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductCategory.hasMany(Product, {
  foreignKey: "categoryId",
  as: "products",
});

// Product → ProductSubCategory
Product.belongsTo(ProductSubCategory, {
  foreignKey: "subCategoryId",
  as: "subCategory",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductSubCategory.hasMany(Product, {
  foreignKey: "subCategoryId",
  as: "products",
});

// Product → ProductChildCategory
Product.belongsTo(ProductChildCategory, {
  foreignKey: "childCategoryId",
  as: "childCategory",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductChildCategory.hasMany(Product, {
  foreignKey: "childCategoryId",
  as: "products",
});

// Product → ProductMaterial
Product.belongsTo(ProductMaterial, {
  foreignKey: "productMaterialId",
  as: "material",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductMaterial.hasMany(Product, {
  foreignKey: "productMaterialId",
  as: "products",
});

// Product → ProductOccasion
Product.belongsTo(ProductOccasion, {
  foreignKey: "OccasionId",
  as: "Occasion",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductOccasion.hasMany(Product, {
  foreignKey: "OccasionId",
  as: "products",
});

// ProductInventory → Product
ProductInventory.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Product.hasMany(ProductInventory, {
  foreignKey: "productId",
  as: "inventories",
});

// ProductInventory → ProductColorVariation
ProductInventory.belongsTo(ProductColorVariation, {
  foreignKey: "productColorVariationId",
  as: "productColor",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductColorVariation.hasMany(ProductInventory, {
  foreignKey: "productColorVariationId",
  as: "inventories",
});

// ProductInventory → ProductSizeVariation
ProductInventory.belongsTo(ProductSizeVariation, {
  foreignKey: "productSizeVariationId",
  as: "productSize",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductSizeVariation.hasMany(ProductInventory, {
  foreignKey: "productSizeVariationId",
  as: "inventories",
});

// ProductSizeChart → ProductCategory
ProductSizeChart.belongsTo(ProductCategory, {
  foreignKey: "categoryId",
  as: "category",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductCategory.hasOne(ProductSizeChart, {
  foreignKey: "categoryId",
  as: "productSize",
});

// cart 

Cart.hasMany(CartItems, {
  foreignKey: "cartId",
  as: "items",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

CartItems.belongsTo(Cart, {
  foreignKey: "cartId",
  as: "cart",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Product.hasMany(CartItems, {
  foreignKey: "productId",
  as: "cartItems",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

CartItems.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

ProductColorVariation.hasMany(CartItems, {
  foreignKey: "productColorVariationId",
  as: "cartItems",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

CartItems.belongsTo(ProductColorVariation, {
  foreignKey: "productColorVariationId",
  as: "colorVariation",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});


module.exports = {
  Customer,
  Product,
  ProductCategory,
  ProductSubCategory,
  ProductChildCategory,
  ProductOccasion,
  ProductMaterial,
  ProductInventory,
  ProductColorVariation,
  ProductSizeVariation,
  ProductSizeChart,
};
// Product.hasMany(Review, { foreignKey: 'productId', onDelete: 'CASCADE' });
// Review.belongsTo(Product, { foreignKey: 'productId' });

// Customer.hasMany(Review, { foreignKey: 'customerId' });
// Review.belongsTo(Customer, { foreignKey: 'customerId' });

// Category.hasMany(SubCategory, {
//   foreignKey: 'categoryId',
//   onDelete: 'CASCADE'
// });
// SubCategory.belongsTo(Category, {
//   foreignKey: 'categoryId'
// });

// SubCategory.hasMany(Product, {
//   foreignKey: 'subCategoryId',
//   onDelete: 'CASCADE'
// });
// Product.belongsTo(SubCategory, {
//   foreignKey: 'subCategoryId'
// });

// // Customer.hasMany(Address, { foreignKey: 'customerId' });
// // Address.belongsTo(Customer, { foreignKey: 'customerId' });
