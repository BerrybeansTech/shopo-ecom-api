const express = require('express');
const CustomerController = require('../controllers/customer/customers.controller')
const CartController = require('../controllers/customer/cart.controller')
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

// Cart routes
router.get('/cart', authenticateToken.authenticateToken, CartController.getCart);
router.post('/cart', authenticateToken.authenticateToken, CartController.createCart);
router.put('/cart', authenticateToken.authenticateToken, CartController.updateCart);
router.delete('/cart', authenticateToken.authenticateToken, CartController.deleteCart);

// Cart items routes
router.get('/cart/items', authenticateToken.authenticateToken, CartItemsController.getCartItems);
router.post('/cart/items', authenticateToken.authenticateToken, CartItemsController.addItem);
router.put('/cart/items/:id', authenticateToken.authenticateToken, CartItemsController.updateItem);
router.delete('/cart/items/:id', authenticateToken.authenticateToken, CartItemsController.removeItem);

module.exports = router;
