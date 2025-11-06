const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/category/categorys.controller");


router.post("/category", categoryController.createCategory);
router.get("/categories", categoryController.getAllCategories);
router.put("/category/:id", categoryController.updateCategory);
router.delete("/category/:id", categoryController.deleteCategory);


router.post("/subcategory", categoryController.createSubCategory);
router.get("/subcategories", categoryController.getAllSubCategories);
router.put("/subcategory/:id", categoryController.updateSubCategory);
router.delete("/subcategory/:id", categoryController.deleteSubCategory);


router.post("/childcategory", categoryController.createChildCategory);
router.get("/childcategories", categoryController.getAllChildCategories);
router.put("/childcategory/:id", categoryController.updateChildCategory);
router.delete("/childcategory/:id", categoryController.deleteChildCategory);

module.exports = router;
