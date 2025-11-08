const express = require("express");
const router = express.Router();
const upload = require('../config/multer.config')
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
const sizeChartController = require("../controllers/product/sizeChart.controller");


router.post('/create-product', upload.fields([
    { name: "thumbnailImage", maxCount: 1 },
    { name: "galleryImage", maxCount: 10 }, 
  ]), ProductController.createProduct);
// router.put('/update-product', authenticateToken.authenticateToken, upload.fields([
//     { name: "thumbnailImage", maxCount: 1 },
//     { name: "galleryImage", maxCount: 10 }, 
//   ]),  productController.updateProduct);

router.post("/material/create", MaterialController.createMaterial);
router.get("/material/get-all", MaterialController.getAllMaterials);
router.get("/material/get-material/:id", MaterialController.getMaterialById);
router.put("/material/update/:id", MaterialController.updateMaterial);
router.delete("/material/delete/:id", MaterialController.deleteMaterial);


router.post("/occasion/create", OccasionController.createOccasion);
router.get("/occasion/get-all", OccasionController.getAllOccasions);
router.get("/occasion/get-occasion/:id", OccasionController.getOccasionById);
router.put("/occasion/update/:id", OccasionController.updateOccasion);
router.delete("/occasion/delete/:id", OccasionController.deleteOccasion);


router.post("/ccccc/category", upload.single("image"), categoryController.createCategory);
router.get("/category/get-all", categoryController.getAllCategories);
router.get("/category/get-category/:id", categoryController.getCategoryById);
router.put("/category/update/:id", upload.single("image"), categoryController.updateCategory);
router.delete("/category/delete/:id", categoryController.deleteCategory);


router.post("/subcategory/create", categoryController.createSubCategory);
router.get("/subcategory/get-all", categoryController.getAllSubCategories);
router.get("/subcategory/get-subcategory/:id", categoryController.getSubCategoryById);
router.put("/subcategory/update/:id", categoryController.updateSubCategory);
router.delete("/subcategory/delete/:id", categoryController.deleteSubCategory);


router.post("/childcategory/create", categoryController.createChildCategory);
router.get("/childcategory/get-all", categoryController.getAllChildCategories);
router.get("/childcategory/get-childcategory/:id", categoryController.getChildCategoryById);
router.put("/childcategory/update/:id", categoryController.updateChildCategory);
router.delete("/childcategory/delete/:id", categoryController.deleteChildCategory);

router.post("/size/create", createSizeVariation);
router.get("/size/get-all", getAllSizeVariations);
router.get("/size/get-size/:id", getSizeVariationById);
router.put("/size/update/:id", updateSizeVariation);
router.delete("/size/delete/:id", deleteSizeVariation);

router.post("/color/create", createColorVariation);
router.get("/color/get-all", getAllColorVariations);
router.get("/color/get-color/:id", getColorVariationById);
router.put("/color/update-color/:id", updateColorVariation);
router.delete("/color/delete-color/:id", deleteColorVariation);

router.get("/size-chart/get-all", sizeChartController.getAllSizeCharts);
router.get("/size-chart/get-size-chart/:id", sizeChartController.getSizeChartById);
router.post("/size-chart/create", sizeChartController.createSizeChart);
router.put("/size-chart/update/:id", sizeChartController.updateSizeChart);
router.delete("/size-chart/delete/:id", sizeChartController.deleteSizeChart);

module.exports = router;
