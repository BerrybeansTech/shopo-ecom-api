const express = require("express");
const router = express.Router();
const MaterialController = require("../controllers/product/material.controller");

router.post("/create", MaterialController.createMaterial);
router.get("/all", MaterialController.getAllMaterials);
router.get("/:id", MaterialController.getMaterialById);
router.put("/update/:id", MaterialController.updateMaterial);
router.delete("/delete/:id", MaterialController.deleteMaterial);

module.exports = router;
