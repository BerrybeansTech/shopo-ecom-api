const Cart = require('../../models/customer/cart.model');
const CartItem = require('../../models/customer/cartItems.model');
const Product = require('../../models/product/product.model');
const ProductColorVariation = require('../../models/product/product-colorVariation.model');
const ProductSizeVariation = require('../../models/product/product-sizeVariation.model');


exports.getCartItems = async (req, res) => {
  try {
    const customerId = req.user.id;

    const cart = await Cart.findOne({ where: { customerId, isActive: true } });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [
        { model: Product, as: 'Product', attributes: ['id', 'name', 'price', 'images'] },
        { model: ProductColorVariation, as: 'ProductColorVariation', attributes: ['id', 'colorName'] },
        { model: ProductSizeVariation, as: 'ProductSizeVariation', attributes: ['id', 'sizeName'] }
      ]
    });

    res.status(200).json({ success: true, data: cartItems });
  } catch (error) {
    console.error('Get Cart Items Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.addItem = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { productId, productColorVariationId, productSizeVariationId, quantity } = req.body;

    if (!productId || !productColorVariationId || !productSizeVariationId || !quantity) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    let cart = await Cart.findOne({ where: { customerId, isActive: true } });
    if (!cart) cart = await Cart.create({ customerId });

    const existingItem = await CartItem.findOne({
      where: { cartId: cart.id, productId, productColorVariationId, productSizeVariationId }
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      await existingItem.save();
      return res.status(200).json({
        success: true,
        message: 'Cart item updated successfully',
        data: existingItem
      });
    }

    const cartItem = await CartItem.create({
      cartId: cart.id,
      productId,
      productColorVariationId,
      productSizeVariationId,
      quantity
    });

    res.status(201).json({
      success: true,
      message: 'Item added to cart successfully',
      data: cartItem
    });
  } catch (error) {
    console.error('Add Item Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1)
      return res.status(400).json({ success: false, message: 'Valid quantity is required' });

    const cart = await Cart.findOne({ where: { customerId, isActive: true } });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const cartItem = await CartItem.findOne({ where: { id, cartId: cart.id } });
    if (!cartItem)
      return res.status(404).json({ success: false, message: 'Cart item not found' });

    cartItem.quantity = quantity;
    await cartItem.save();

    res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: cartItem
    });
  } catch (error) {
    console.error('Update Item Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.removeItem = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;

    const cart = await Cart.findOne({ where: { customerId, isActive: true } });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

    const cartItem = await CartItem.findOne({ where: { id, cartId: cart.id } });
    if (!cartItem)
      return res.status(404).json({ success: false, message: 'Cart item not found' });

    await cartItem.destroy();

    res.status(200).json({
      success: true,
      message: 'Cart item removed successfully'
    });
  } catch (error) {
    console.error('Remove Item Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
