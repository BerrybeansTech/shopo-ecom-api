const express = require('express');
const comboOfferController = require('../controllers/offer/comboOffer.controller')

const upload = require('../config/multer.config')

const router = express.Router();


router.get('/get-all-combo-offer', comboOfferController.getAllComboOffer)
router.get('/get-combo-offer/:id', comboOfferController.getComboOfferById)
router.post('/create-combo-offer',  upload.fields([
    { name: "bannerImage", maxCount: 1 }, 
  ]), comboOfferController.createComboOffer);
router.put('/update-combo-offer', upload.fields([
    { name: "bannerImage", maxCount: 1 }, 
  ]),  comboOfferController.updateComboOffer);
router.delete('/delete-combo-offer/:id', comboOfferController.deleteComboOffer);


module.exports = router;