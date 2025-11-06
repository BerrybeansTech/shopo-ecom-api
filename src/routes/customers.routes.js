const express = require('express');
const CustomerController = require('../controllers/customers.controller')

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

module.exports = router;