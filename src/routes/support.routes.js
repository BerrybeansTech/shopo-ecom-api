const express = require("express");
const router = express.Router();
const supportController = require("../controllers/support.controller");

router.get("/get-all-support", supportController.getAllSupports);
router.get("/get-support/:id", supportController.getSupportById);
router.post("/create-support", supportController.createSupport);
router.put("/update-support/:id", supportController.updateSupport);
router.delete("/delete-support/:id", supportController.deleteSupport);

module.exports = router;
