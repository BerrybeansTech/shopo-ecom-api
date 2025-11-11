const express = require("express");
const orderController = require("../controllers/order/order.controller");
const authenticateToken = require('../middlewares/authenticateJWT')

const router = express.Router();

router.get('/get-all-orders', authenticateToken.authenticateToken, orderController.getAllOrders);
router.get('/get-order/:id', authenticateToken.authenticateToken, orderController.getOrderDetial);
router.get('/get-customer-order/:id', authenticateToken.authenticateToken, orderController.getCustomerOrder);
router.post('/create-order', authenticateToken.authenticateToken, orderController.createOrder);
router.put('/update-order', authenticateToken.authenticateToken, orderController.updateOrder);

// router.delete('/delete-order/:id', authenticateToken.authenticateToken, orderController.deleteOrder);

module.exports = router;
