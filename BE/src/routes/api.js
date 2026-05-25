const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Route Tes Dasar 
router.get('/status', (req, res) => {
  res.json({ message: "API Backend redy" });
});

// Route AI dan OCR
router.post('/anomaly-detect', aiController.detectAnomaly);
router.post('/ocr-receipt', aiController.processOCR);

module.exports = router;