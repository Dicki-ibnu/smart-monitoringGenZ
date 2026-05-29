const express = require('express');
const router = express.Router();

// Import Controller
const aiController = require('../controllers/aiController');
const transactionController = require('../controllers/transactionController');

// Import Middleware Joi
const validateTransaction = require('../middleware/validateTransaction');

// --- ROUTE TES DASAR ---
router.get('/status', (req, res) => {
  res.json({ message: "API Backend ready" });
});

// --- ROUTE TRANSAKSI (Redis & RabbitMQ Terintegrasi di Controller) ---
// GET: Mengambil riwayat transaksi (Nanti menggunakan Redis Cache biar super cepat)
router.get('/transactions', transactionController.getTransactions);

// POST: Tambah transaksi (Melewati Satpam Joi -> Simpan DB -> Hapus Cache Redis -> Lempar OCR ke RabbitMQ)
router.post('/transactions', validateTransaction, transactionController.addTransaction);


// --- ROUTE AI & OCR ---
// Route ini tetap ada untuk memproses prediksi AI secara langsung atau sebagai endpoint internal
router.post('/anomaly-detect', aiController.detectAnomaly);
router.post('/ocr-receipt', aiController.processOCR);

module.exports = router;  