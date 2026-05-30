// File: routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Rute untuk AI
router.post('/anomaly-detect', aiController.detectAnomaly);
router.post('/ocr-receipt', aiController.ocrReceipt);

module.exports = router;