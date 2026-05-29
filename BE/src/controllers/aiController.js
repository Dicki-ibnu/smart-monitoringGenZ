// File: controllers/aiController.js

const { sendToQueue } = require('../config/rabbitmq');

const detectAnomaly = async (req, res) => {
  try {
    const { transactions } = req.body;
    
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(200).json({ success: true, anomalies: [], model: "Z-Score" });
    }

    const expenses = transactions.filter(t => (t.type || 'expense') === 'expense');
    const amounts = expenses.map(t => Number(t.amount) || 0);
    
    if (amounts.length === 0) {
      return res.status(200).json({ success: true, anomalies: [], model: "Z-Score" });
    }

    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance) || 1; // || 1 untuk mencegah pembagian dengan 0

    const anomalies = [];
    expenses.forEach(tx => {
      const zScore = Math.abs((tx.amount - mean) / stdDev);
      if (zScore > 2) {
        anomalies.push({
          transaction_id: tx.id,
          z_score: zScore.toFixed(2), // Dibulatkan 2 angka di belakang koma
          severity: zScore > 3 ? 'high' : 'medium',
          alert_type: 'unusual_spending',
          message: `Terdeteksi pengeluaran mencurigakan sebesar Rp${Number(tx.amount).toLocaleString('id-ID')}`
        });
      }
    });

    res.status(200).json({
      success: true,
      anomalies,
      model: "Z-Score Inference Engine",
      stats: { total: transactions.length }
    });
  } catch (error) {
    console.error("Error di Anomaly Detect:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const processOCR = async (req, res) => {
  try {
    const { image_url, raw_text } = req.body;

    // ========================================================
    // Melempar URL gambar struk ke Message Broker untuk diproses
    // oleh model AI Python di belakang layar (Asynchronous)
    // ========================================================
    if (image_url) {
      try {
        sendToQueue('ocr_tasks', { image_url, timestamp: new Date() });
        console.log(`[RabbitMQ] Tugas OCR untuk gambar masuk ke antrean!`);
      } catch (qErr) {
        console.warn(`[RabbitMQ] Gagal masuk antrean (Pindah ke mode Mock):`, qErr.message);
      }
    }

    // --- LOGIKA MOCK-UP SEMENTARA ---
    const lines = raw_text ? raw_text.split('\n').filter(l => l.trim()) : [];
    const merchant_name = lines[0] || 'Unknown Merchant';

    const totalMatch = raw_text ? raw_text.match(/(?:total|amount|sum|due)[:\s]*\$?([\d,.]+)/i) : null;
    const total_amount = totalMatch ? parseFloat(totalMatch[1].replace(',', '')) : 0;

    const dateMatch = raw_text ? raw_text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/) : null;
    // PERBAIKAN: Format tanggal Supabase/SQL adalah YYYY-MM-DD
    const transaction_date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0]; 

    const items = lines.slice(1).filter(l => !l.match(/^(total|subtotal|tax|date)/i));

    res.status(200).json({
      success: true,
      raw_text: raw_text || "Teks struk tidak terbaca",
      merchant_name,
      total_amount,
      transaction_date,
      items
    });
  } catch (error) {
    console.error("Error di proses OCR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  detectAnomaly,
  processOCR
};