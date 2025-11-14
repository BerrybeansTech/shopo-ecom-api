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

    // Get the authenticated user's ID
    const customerId = req.user.id;

    // Use a single query with proper joins to ensure cart isolation
    const { count, rows } = await CartItems.findAndCountAll({
      include: [
        {
          model: Cart,
          as: "cart",
          where: { customerId, isActive: true },
          attributes: [], // Don't select cart fields
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
  // Use authenticated user's ID instead of params
  const customerId = req.user.id;

  // const baseUrl = `${req.protocol}://${req.get("host")}/`;

    const host = req.get("host").split(":")[0];
    const baseUrl = `${req.protocol}://${host}/`;

  const cart = await Cart.findOne({ where: { customerId, isActive: true } });

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
};

exports.createCartItem = async (req, res) => {
  try {
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

    let cart = await Cart.findOne({ where: { customerId, isActive: true } });
    if (!cart) {
      cart = await Cart.create({ customerId, isActive: true });
    }

    const existingCartItem = await CartItems.findOne({
      where: {
        cartId: cart.id, 
        productId,
        productColorVariationId,
        productSizeVariationId,
      },
    });

    if (existingCartItem) {
      return res.status(200).json({
        success: false,
        message: "Item already exists in the cart",
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
  const { id } = req.params;
  const clearedCart = await CartItems.destroy({ where: { cartId: id } });

  res.json({
    success: true,
    message: "Cart items deleted successfully",
    data: clearedCart,
  });
};

exports.updateCartItem = async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  const item = await CartItems.findByPk(id);

  if (!item) {
    const error = new Error("Cart item not found");
    error.status = 404;
    throw error;
  }

  await CartItems.update({ quantity }, { where: { id } });

  res.json({
    success: true,
    message: "Cart item updated successfully",
  });
};

exports.deleteCartItem = async (req, res) => {
  const { id } = req.params;

  const item = await CartItems.findByPk(id);

  if (!item) {
    const error = new Error("Cart item not found");
    error.status = 404;
    throw error;
  }

  await CartItems.destroy({ where: { id } });

  res.json({
    success: true,
    message: "Cart item deleted successfully",
    data: item,
  });
};
