const express = require('express');
const CustomerController = require('../controllers/customer/customers.controller')
const CartItemsController = require('../controllers/customer/cartItems.controller')

// const upload = require('../utils/multer')

const authenticateToken = require('../middlewares/authenticateJWT')

const router = express.Router();

router.get('/get-all-customer', authenticateToken.authenticateToken, CustomerController.getAllCustomers)
router.get('/get-customer/:id', authenticateToken.authenticateToken, CustomerController.getCustomersById)
router.post('/create-customer', CustomerController.createCustomers);
router.post('/login', CustomerController.customerLogin);
router.post('/reset-password', CustomerController.resetPassword);
router.put('/update-customer', authenticateToken.authenticateToken, CustomerController.updateCustomers);
router.delete('/delete-customer/:id', authenticateToken.authenticateToken, CustomerController.deleteCustomers);
router.get('/check-exists', CustomerController.checkUserExists);


router.get('/wishlist/:id', authenticateToken.authenticateToken, CustomerController.getUserWishlist);
router.post('/update-wishlist', authenticateToken.authenticateToken, CustomerController.updateWishlist);


router.get('/cart/get-all-items', authenticateToken.authenticateToken, CartItemsController.getAllCartItems);
router.get('/cart/get-item/:id', authenticateToken.authenticateToken, CartItemsController.getCartItemByCartId);
router.post('/cart/add-to-cart', authenticateToken.authenticateToken, CartItemsController.createCartItem);
router.put('/cart/update-items/:id', authenticateToken.authenticateToken, CartItemsController.updateCartItem);
router.delete('/cart/delete-items/:id', authenticateToken.authenticateToken, CartItemsController.deleteCartItem);
router.delete('/cart/clear-cart/:id', authenticateToken.authenticateToken, CartItemsController.clearCartItem);

module.exports = router;
