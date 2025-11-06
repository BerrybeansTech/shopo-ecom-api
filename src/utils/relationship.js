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
// const Address = require('./address/model');

// ProductSubCategory ↔ ProductCategory
ProductSubCategory.belongsTo(ProductCategory, {
  foreignKey: "categoryId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductCategory.hasMany(ProductSubCategory, {
  foreignKey: "categoryId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// ProductChildCategory ↔ ProductSubCategory
ProductChildCategory.belongsTo(ProductSubCategory, {
  foreignKey: "subCategoryId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductSubCategory.hasMany(ProductChildCategory, {
  foreignKey: "subCategoryId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Product ↔ ProductCategory
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

// Product ↔ ProductSubCategory
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

// Product ↔ ProductChildCategory
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

// Product ↔ ProductMaterial
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

// Product ↔ ProductSeasonalCategory
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

// ProductInventory ↔ Product
ProductInventory.belongsTo(Product, {
  foreignKey: "productId",
  as: "product",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
Product.hasMany(ProductInventory, {
  foreignKey: "productId",
  as: "products",
});

// ProductInventory ↔ ProductColorVariation
ProductInventory.belongsTo(ProductColorVariation, {
  foreignKey: "productColorVariationId",
  as: "productColor",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductColorVariation.hasMany(ProductInventory, {
  foreignKey: "productColorVariationId",
  as: "productColor",
});

// ProductInventory ↔ ProductSizeVariation
ProductInventory.belongsTo(ProductSizeVariation, {
  foreignKey: "productSizeVariationId",
  as: "productSize",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ProductSizeVariation.hasMany(ProductInventory, {
  foreignKey: "productSizeVariationId",
  as: "productSize",
});


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

// Cart.hasMany(CartItem, { foreignKey: 'cartId' });
// CartItem.belongsTo(Cart, { foreignKey: 'cartId' });

// Product.hasMany(CartItem, { foreignKey: 'productId' });
// CartItem.belongsTo(Product, { foreignKey: 'productId' });
