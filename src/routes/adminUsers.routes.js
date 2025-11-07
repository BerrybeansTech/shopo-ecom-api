const express = require('express');
const AdminUSerController = require('../controllers/admin-user/adminUser.controller')

// const upload = require('../utils/multer')

const authenticateToken = require('../middlewares/authenticateJWT')

const router = express.Router();

router.post('/create-admin', AdminUSerController.createAdminUser);
router.post('/login', AdminUSerController.adminLogin);

module.exports = router;