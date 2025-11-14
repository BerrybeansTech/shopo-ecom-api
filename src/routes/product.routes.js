const express = require("express");
const router = express.Router();
const upload = require('../config/multer.config')
const { authenticateToken } = require('../middlewares/authenticateJWT')
const {
  createColorVariation,
  getAllColorVariations,
  getColorVariationById,
  updateColorVariation,
  deleteColorVariation
} = require("../controllers/product/colorVariation.controller");
const {
  createSizeVariation,
  getAllSizeVariations,
  getSizeVariationById,
  updateSizeVariation,
  deleteSizeVariation
} = require("../controllers/product/sizeVariation.controller");
const categoryController = require("../controllers/product/categorys.controller");
const OccasionController = require("../controllers/product/Occasion.controller");
const MaterialController = require("../controllers/product/material.controller");
const ProductController = require("../controllers/product/product.controller");
const ProductReviewController = require("../controllers/product/product-review.controller");
const sizeChartController = require("../controllers/product/sizeChart.controller");


router.get("/get-all-product", ProductController.getAllProduct);
router.get("/get-product/:id", ProductController.getProductById);
router.post('/create-product', authenticateToken, upload.fields([
    { name: "thumbnailImage", maxCount: 1 },
    { name: "galleryImage", maxCount: 10 }, 
  ]), ProductController.createProduct);
router.put('/update-product', authenticateToken , upload.fields([
    { name: "thumbnailImage", maxCount: 1 },
    { name: "galleryImage", maxCount: 10 }, 
  ]),  ProductController.updateProduct);

router.put("/inventory/update", authenticateToken, ProductController.updateInventory);

router.post("/material/create", authenticateToken, MaterialController.createMaterial);
router.get("/material/get-all", MaterialController.getAllMaterials);
router.get("/material/get-material/:id", MaterialController.getMaterialById);
router.put("/material/update/:id", authenticateToken, MaterialController.updateMaterial);
router.delete("/material/delete/:id", authenticateToken, MaterialController.deleteMaterial);


router.post("/occasion/create", authenticateToken, OccasionController.createOccasion);
router.get("/occasion/get-all", OccasionController.getAllOccasions);
router.get("/occasion/get-occasion/:id", OccasionController.getOccasionById);
router.put("/occasion/update/:id", authenticateToken, OccasionController.updateOccasion);
router.delete("/occasion/delete/:id", authenticateToken, OccasionController.deleteOccasion);


router.post("/category/create", authenticateToken, upload.single("image"), categoryController.createCategory);
router.get("/category/get-all", categoryController.getAllCategories);
router.get("/category/get-category/:id", categoryController.getCategoryById);
router.put("/category/update/:id", authenticateToken, upload.single("image"), categoryController.updateCategory);
router.delete("/category/delete/:id", authenticateToken, categoryController.deleteCategory);


router.post("/subcategory/create", authenticateToken, categoryController.createSubCategory);
router.get("/subcategory/get-all", categoryController.getAllSubCategories);
router.get("/subcategory/get-subcategory/:id", categoryController.getSubCategoryById);
router.put("/subcategory/update/:id", authenticateToken, categoryController.updateSubCategory);
router.delete("/subcategory/delete/:id", authenticateToken, categoryController.deleteSubCategory);


router.post("/childcategory/create", authenticateToken, categoryController.createChildCategory);
router.get("/childcategory/get-all", categoryController.getAllChildCategories);
router.get("/childcategory/get-childcategory/:id", categoryController.getChildCategoryById);
router.put("/childcategory/update/:id", authenticateToken, categoryController.updateChildCategory);
router.delete("/childcategory/delete/:id", authenticateToken, categoryController.deleteChildCategory);

router.post("/size/create", authenticateToken, createSizeVariation);
router.get("/size/get-all", getAllSizeVariations);
router.get("/size/get-size/:id", getSizeVariationById);
router.put("/size/update/:id", authenticateToken, updateSizeVariation);
router.delete("/size/delete/:id", authenticateToken, deleteSizeVariation);

router.post("/color/create", authenticateToken, createColorVariation);
router.get("/color/get-all", getAllColorVariations);
router.get("/color/get-color/:id", getColorVariationById);
router.put("/color/update-color/:id", authenticateToken, updateColorVariation);
router.delete("/color/delete-color/:id", authenticateToken, deleteColorVariation);

router.get("/size-chart/get-all", sizeChartController.getAllSizeCharts);
router.get("/size-chart/get-size-chart/:id", sizeChartController.getSizeChartById);
router.post("/size-chart/create", authenticateToken, upload.fields([
    { name: "image", maxCount: 1 }, 
  ]), sizeChartController.createSizeChart);
router.put("/size-chart/update/:id", authenticateToken, sizeChartController.updateSizeChart);
router.delete("/size-chart/delete/:id", authenticateToken, sizeChartController.deleteSizeChart);


router.post("/review/create", authenticateToken, ProductReviewController.createReview);
router.get("/review/get-all", ProductReviewController.getAllReviews);
router.get("/review/get-by-product/:productId", ProductReviewController.getReviewsByProduct);
router.get("/review/get-review/:id", ProductReviewController.getReviewById);
router.put("/review/update/:id", authenticateToken, ProductReviewController.updateReview);
router.delete("/review/delete/:id", authenticateToken, ProductReviewController.deleteReview);

module.exports = router;
