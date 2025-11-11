const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order/order.controller');
const invoiceController = require('../controllers/order/invoice.controller');
const { authenticateToken } = require('../middlewares/authenticateJWT');

// Order routes
router.get('/orders', authenticateToken, orderController.getAllOrders);
router.get('/orders/:id', authenticateToken, orderController.getOrderDetail);
router.get('/customer-orders/:id', authenticateToken, orderController.getCustomerOrder);
router.post('/orders', authenticateToken, orderController.createOrder);
router.put('/orders/:id', authenticateToken, orderController.updateOrder);
router.delete('/orders/:id', authenticateToken, orderController.deleteOrder);

// Invoice routes
router.get('/invoices', authenticateToken, invoiceController.getAllInvoices);
router.get('/invoices/:id', authenticateToken, invoiceController.getInvoiceById);
router.post('/invoices', authenticateToken, invoiceController.createInvoice);
router.put('/invoices/:id', authenticateToken, invoiceController.updateInvoice);
router.delete('/invoices/:id', authenticateToken, invoiceController.deleteInvoice);

router.get('/invoices/view/:filename', authenticateToken, invoiceController.viewInvoice);
router.get('/invoices/download/:filename', authenticateToken, invoiceController.downloadInvoice);

module.exports = router;