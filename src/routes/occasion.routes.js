const express = require("express");
const router = express.Router();
const OccasionController = require("../controllers/product/Occasion.controller");

router.post("/create", OccasionController.createOccasion);
router.get("/all", OccasionController.getAllOccasions);
router.get("/:id", OccasionController.getOccasionById);
router.put("/update/:id", OccasionController.updateOccasion);
router.delete("/delete/:id", OccasionController.deleteOccasion);

module.exports = router;
