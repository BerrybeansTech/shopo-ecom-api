const Cart = require('../../models/customer/cart.model');
const CartItem = require('../../models/customer/cartItems.model');
const Product = require('../../models/product/product.model');
const ProductColorVariation = require('../../models/product/product-colorVariation.model');
const ProductSizeVariation = require('../../models/product/product-sizeVariation.model');


exports.getCart = async (req, res) => {
  try {
    const customerId = req.user.id; // From JWT

    const cart = await Cart.findOne({
      where: { customerId, isActive: true },
      include: [
        {
          model: CartItem,
          as: 'CartItems',
          include: [
            { model: Product, as: 'Product', attributes: ['id', 'name', 'price', 'images'] },
            { model: ProductColorVariation, as: 'ProductColorVariation', attributes: ['id', 'colorName'] },
            { model: ProductSizeVariation, as: 'ProductSizeVariation', attributes: ['id', 'sizeName'] }
          ]
        }
      ]
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    res.status(200).json({ success: true, data: cart });
  } catch (error) {
    console.error('Get Cart Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.createCart = async (req, res) => {
  try {
    const customerId = req.user.id;

    const existingCart = await Cart.findOne({
      where: { customerId, isActive: true }
    });

    if (existingCart) {
      return res.status(400).json({ success: false, message: 'Customer already has an active cart' });
    }

    const cart = await Cart.create({ customerId });
    res.status(201).json({ success: true, message: 'Cart created successfully', data: cart });
  } catch (error) {
    console.error('Create Cart Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.updateCart = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { isActive } = req.body;

    const cart = await Cart.findOne({
      where: { customerId, isActive: true }
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.isActive = isActive;
    await cart.save();

    res.status(200).json({ success: true, message: 'Cart updated successfully', data: cart });
  } catch (error) {
    console.error('Update Cart Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCart = async (req, res) => {
  try {
    const customerId = req.user.id;

    const cart = await Cart.findOne({
      where: { customerId, isActive: true }
    });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.isActive = false;
    await cart.save();

    res.status(200).json({ success: true, message: 'Cart deleted successfully' });
  } catch (error) {
    console.error('Delete Cart Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
