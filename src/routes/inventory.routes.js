const express = require("express");
const router = express.Router();
const InventoryController = require("../controllers/product/inventory.controller");

router.post("/create", InventoryController.createInventory);
router.get("/all", InventoryController.getAllInventories);
router.get("/:id", InventoryController.getInventoryById);
router.put("/update/:id", InventoryController.updateInventory);
router.delete("/delete/:id", InventoryController.deleteInventory);

module.exports = router;
