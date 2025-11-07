const express = require("express");
const router = express.Router();
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


router.post("/product-category/category", categoryController.createCategory);
router.get("/product-category/get-all", categoryController.getAllCategories);
router.put("/product-category/update/:id", categoryController.updateCategory);
router.delete("/product-category/delete/:id", categoryController.deleteCategory);


router.post("/product-subcategory/create", categoryController.createSubCategory);
router.get("/product-subcategory/get-all", categoryController.getAllSubCategories);
router.put("/product-subcategory/update/:id", categoryController.updateSubCategory);
router.delete("/product-subcategory/delete/:id", categoryController.deleteSubCategory);


router.post("/product-childcategory/create", categoryController.createChildCategory);
router.get("/product-childcategory/get-all", categoryController.getAllChildCategories);
router.put("/product-childcategory/update/:id", categoryController.updateChildCategory);
router.delete("/product-childcategory/delete/:id", categoryController.deleteChildCategory);

router.post("/product-size/create", createSizeVariation);
router.get("/product-size/get-all", getAllSizeVariations);
router.get("/product-size/get-size/:id", getSizeVariationById);
router.put("/product-size/update/:id", updateSizeVariation);
router.delete("/product-size/delete/:id", deleteSizeVariation);

router.post("/product-color/create", createColorVariation);
router.get("/product-color/get-all", getAllColorVariations);
router.get("/product-color/get-color/:id", getColorVariationById);
router.put("/product-color/update-color/:id", updateColorVariation);
router.delete("/product-color/delete-color/:id", deleteColorVariation);

module.exports = router;
