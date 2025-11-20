const CartItems = require("../../models/customer/cartItems.model");
const Cart = require("../../models/customer/cart.model");
const Product = require("../../models/product/product.model");

exports.getAllCartItems = async (req, res) => {
  try {
    const host = req.get("host").split(":")[0];
    const baseUrl = `${req.protocol}://${host}/`;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const customerId = req.user.id;

    const { count, rows } = await CartItems.findAndCountAll({
      include: [
        {
          model: Cart,
          as: "cart",
          where: { customerId, isActive: true }, 
          attributes: [], 
        },
        {
          model: Product,
          as: "product",
          attributes: [
            "id",
            "name",
            "sellingPrice",
            "description",
            "thumbnailImage",
          ],
        },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    const updatedRows = rows.map((item) => {
      const cartItem = item.toJSON();

      if (cartItem.product && cartItem.product.thumbnailImage) {
        cartItem.product.thumbnailImage =
          cartItem.product.thumbnailImage.startsWith("http")
            ? cartItem.product.thumbnailImage
            : `${baseUrl}${cartItem.product.thumbnailImage}`;
      }

      return cartItem;
    });

    return res.status(200).json({
      success: true,
      data: updatedRows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cart items.",
      error: error.message,
    });
  }
};

exports.getCartItemByCartId = async (req, res) => {
  try {
    
    const customerId = req.user.id;

    const host = req.get("host").split(":")[0];
    const baseUrl = `${req.protocol}://${host}/`;

   
    const cart = await Cart.findOne({ 
      where: { customerId, isActive: true } 
    });

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const cartItems = await CartItems.findAll({
      where: { cartId: cart.id },
      include: [
        {
          model: Product,
          as: "product",
          attributes: [
            "id",
            "name",
            "sellingPrice",
            "description",
            "galleryImage",
            "thumbnailImage",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const updatedCartItems = cartItems.map((cartItem) => {
      const item = cartItem.toJSON();

      if (item.product) {
        item.product.thumbnailImage = `${baseUrl}${item.product.thumbnailImage}`;

        item.product.galleryImage = Array.isArray(item.product.galleryImage)
          ? item.product.galleryImage.map((img) =>
              img.trim().startsWith("http")
                ? img.trim()
                : `${baseUrl}${img.trim()}`
            )
          : [];
      }

      return item;
    });

    res.json({ success: true, data: updatedCartItems });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cart items.",
      error: error.message,
    });
  }
};

exports.createCartItem = async (req, res) => {
  try {
    const {
      productId,
      productColorVariationId,
      productSizeVariationId,
      quantity,
    } = req.body;
    
    // FIXED: Always get customerId from authenticated token
    const customerId = req.user.id;

    if (!productId || !productColorVariationId || !productSizeVariationId) {
      return res.status(400).json({
        success: false,
        message:
          "productId, productColorVariationId, and productSizeVariationId are required",
      });
    }

    // FIXED: Find or create cart for THIS specific user
    let cart = await Cart.findOne({ 
      where: { customerId, isActive: true } 
    });
    
    if (!cart) {
      cart = await Cart.create({ customerId, isActive: true });
    }

    // FIXED: Check if item already exists in THIS user's cart
    const existingCartItem = await CartItems.findOne({
      where: {
        cartId: cart.id, // ✅ This ensures we check only this user's cart
        productId,
        productColorVariationId,
        productSizeVariationId,
      },
    });

    if (existingCartItem) {
      // If item exists, increase the quantity instead of rejecting
      const newQuantity = existingCartItem.quantity + (quantity || 1);
      await CartItems.update(
        { quantity: newQuantity },
        { where: { id: existingCartItem.id } }
      );

      // Fetch updated item
      const updatedItem = await CartItems.findByPk(existingCartItem.id);

      return res.status(200).json({
        success: true,
        message: "Cart item quantity updated successfully",
        data: updatedItem,
      });
    }

    const newItem = await CartItems.create({
      cartId: cart.id,
      productId,
      productColorVariationId,
      productSizeVariationId,
      quantity: quantity || 1,
    });

    return res.status(201).json({
      success: true,
      message: "Cart item added successfully",
      data: newItem,
    });
  } catch (error) {
    console.error("Error creating cart item:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create cart item",
    });
  }
};

exports.clearCartItem = async (req, res) => {
  try {
    // FIXED: Verify the cart belongs to the authenticated user
    const customerId = req.user.id;
    const { id } = req.params;

    const cart = await Cart.findOne({
      where: { id, customerId, isActive: true }
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found or unauthorized",
      });
    }

    const clearedCart = await CartItems.destroy({ where: { cartId: id } });

    res.json({
      success: true,
      message: "Cart items deleted successfully",
      data: clearedCart,
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear cart items.",
      error: error.message,
    });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const customerId = req.user.id;

    // FIXED: Verify the cart item belongs to the authenticated user
    const item = await CartItems.findOne({
      where: { id },
      include: [{
        model: Cart,
        as: "cart",
        where: { customerId, isActive: true }
      }]
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found or unauthorized",
      });
    }

    await CartItems.update({ quantity }, { where: { id } });

    res.json({
      success: true,
      message: "Cart item updated successfully",
    });
  } catch (error) {
    console.error("Error updating cart item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update cart item.",
      error: error.message,
    });
  }
};

exports.deleteCartItem = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    // FIXED: Verify the cart item belongs to the authenticated user
    const item = await CartItems.findOne({
      where: { id },
      include: [{
        model: Cart,
        as: "cart",
        where: { customerId, isActive: true }
      }]
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Cart item not found or unauthorized",
      });
    }

    await CartItems.destroy({ where: { id } });

    res.json({
      success: true,
      message: "Cart item deleted successfully",
      data: item,
    });
  } catch (error) {
    console.error("Error deleting cart item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete cart item.",
      error: error.message,
    });
  }
};