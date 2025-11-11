const CartItems = require("../../models/customer/cartItems.model");
const Cart = require("../../models/customer/cart.model");
const Product = require("../../models/product/product.model");

exports.getAllCartItems = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}/`;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await CartItems.findAndCountAll({
      include: [
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

    res.json({
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
    console.error("Error getting cart items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve cart items",
    });
  }
};

exports.getCartItemByCartId = async (req, res) => {
  const { id } = req.params;

  try {
    const baseUrl = `${req.protocol}://${req.get("host")}/`;

    const cart = await Cart.findOne({ where: { customerId: id } });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
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
    console.error("Error getting cart item by ID:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve cart item",
    });
  }
};

exports.createCartItem = async (req, res) => {
  const {
    productId,
    productColorVariationId,
    productSizeVariationId,
    quantity,
  } = req.body;
  const customerId = req.user.id;

  if (!productId || !productColorVariationId || !productSizeVariationId) {
    return res.status(400).json({
      success: false,
      message:
        "productId, productColorVariationId, and productSizeVariationId are required",
    });
  }

  try {
    let cart = await Cart.findOne({ where: { customerId, isActive: true } });
    if (!cart) {
      cart = await Cart.create({ customerId });
    }

    let existingCartItem = await CartItems.findOne({
      where: {
        cartID: cart.id,
        productId,
        productColorVariationId,
        productSizeVariationId,
      },
    });

    if (existingCartItem) {
      return res.json({
        success: false,
        message: "item already exist",
        data: existingCartItem,
      });
    }

    const newItem = await CartItems.create({
      cartId: cart.id,
      productId,
      productColorVariationId,
      productSizeVariationId,
      quantity: quantity || 1,
    });

    res.json({
      success: true,
      message: "Cart item added successfully",
      data: newItem,
    });
  } catch (error) {
    console.error("Error creating cart item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add item to cart",
      error: error.message,
    });
  }
};

exports.clearCartItem = async (req, res) => {
  const { id } = req.params;
  try {
    const clearedCart = await CartItems.destroy({ where: { cartId: id } });

    res.json({
      success: true,
      message: "Cart items deleted successfully",
      data: clearedCart,
    });
  } catch (error) {
    console.error("Error deleting cart items:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete cart items",
    });
  }
};

exports.updateCartItem = async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    const item = await CartItems.findByPk(id);

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }

    await CartItems.update({ quantity }, { where: { id } });

    res.json({
      success: true,
      message: "Cart item updated successfully",
    });
  } catch (error) {
    console.error("Error updating cart item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update cart item",
    });
  }
};

exports.deleteCartItem = async (req, res) => {
  const { id } = req.params;

  try {
    const item = await CartItems.findByPk(id);

    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }

    await CartItems.destroy({ where: { id } });

    res.json({
      success: true,
      message: "Cart item deleted successfully",
      data: item,
    });
  } catch (error) {
    console.error("Error deleting cart item:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete cart item",
    });
  }
};
