const express = require("express");
const router = express.Router();
const {
  createSizeVariation,
  getAllSizeVariations,
  getSizeVariationById,
  updateSizeVariation,
  deleteSizeVariation
} = require("../controllers/sizeVariation/sizeVariation.controller");

router.post("/", createSizeVariation);
router.get("/", getAllSizeVariations);
router.get("/:id", getSizeVariationById);
router.put("/:id", updateSizeVariation);
router.delete("/:id", deleteSizeVariation);

module.exports = router;
