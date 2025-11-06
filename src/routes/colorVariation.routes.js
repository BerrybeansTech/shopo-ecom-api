const express = require("express");
const router = express.Router();
const {
  createColorVariation,
  getAllColorVariations,
  getColorVariationById,
  updateColorVariation,
  deleteColorVariation
} = require("../controllers/product/colorVariation.controller");

router.post("/", createColorVariation);
router.get("/", getAllColorVariations);
router.get("/:id", getColorVariationById);
router.put("/:id", updateColorVariation);
router.delete("/:id", deleteColorVariation);

module.exports = router;
