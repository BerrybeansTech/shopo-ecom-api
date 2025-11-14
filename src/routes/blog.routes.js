const express = require('express');
const blogController = require('../controllers/blog/blog.controller')

const upload = require('../config/multer.config')

const router = express.Router();


router.get('/get-all-blog', blogController.getAllBlog)
router.get('/get-blog/:id', blogController.getBlogById)
router.post('/create-blog',  upload.fields([
    { name: "featuredImage", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 }, 
  ]), blogController.createBlog);
router.put('/update-blog', upload.fields([
    { name: "featuredImage", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 }, 
  ]),  blogController.updateBlog);
router.delete('/delete-blog/:id', blogController.deleteBlog);


module.exports = router;