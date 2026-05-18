const express = require("express");
const router = express.Router();
const upload = require("../config/multer.config");
const { authenticateToken } = require("../middlewares/authenticateJWT");
const bannerController = require("../controllers/banner/banner.controller");

router.post(
  "/create",
  authenticateToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  bannerController.createBanner
);

router.get("/get-all", bannerController.getAllBanners);
router.get("/get-active", bannerController.getActiveBanners);
router.get("/get-banner/:id", bannerController.getBannerById);

router.put(
  "/update/:id",
  authenticateToken,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 1 },
  ]),
  bannerController.updateBanner
);

router.put("/update-order", authenticateToken, bannerController.updateBannerOrders);

router.delete("/delete/:id", authenticateToken, bannerController.deleteBanner);

module.exports = router;
