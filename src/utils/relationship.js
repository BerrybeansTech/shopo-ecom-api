const Customer = require("../models/customers.model");
const ApiKeys = require("../models/apiKeys.model");
// const Address = require('./address/model');

Customer.hasOne(ApiKeys, {
  foreignKey: "customerId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});
ApiKeys.belongsTo(Customer, {
  foreignKey: "customerId",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
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
