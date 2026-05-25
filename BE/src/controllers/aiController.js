const detectAnomaly = async (req, res) => {
  try {
    const { transactions } = req.body;
    
    // Logika deteksi anomali sederhana menggunakan standar deviasi (Z-score)
    // integrasi fitur AI ML di backend
    const expenses = transactions.filter(t => t.type === 'expense');
    const amounts = expenses.map(t => Number(t.amount));
    
    if (amounts.length === 0) {
      return res.status(200).json({ success: true, anomalies: [], model: "Z-Score" });
    }

    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance) || 1;

    const anomalies = [];
    expenses.forEach(tx => {
      const zScore = Math.abs((tx.amount - mean) / stdDev);
      // Jika pengeluaran lebih dari 2 standar deviasi, anggap anomali
      if (zScore > 2) {
        anomalies.push({
          transaction_id: tx.id,
          z_score: zScore,
          severity: zScore > 3 ? 'high' : 'medium',
          alert_type: 'unusual_spending',
          message: `Terdeteksi transaksi mencurigakan pada ${tx.description} sebesar ${tx.amount}`,
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
    res.status(500).json({ success: false, message: error.message });
  }
};

const processOCR = async (req, res) => {
  try {
    const { image_url, raw_text } = req.body;

    // Membaca baris teks teks yang dikirim dari frontend
    const lines = raw_text ? raw_text.split('\n').filter(l => l.trim()) : [];
    const merchant_name = lines[0] || 'Unknown Merchant';

    // Regex untuk mencari total nominal uang
    const totalMatch = raw_text ? raw_text.match(/(?:total|amount|sum|due)[:\s]*\$?([\d,.]+)/i) : null;
    const total_amount = totalMatch ? parseFloat(totalMatch[1].replace(',', '')) : 0;

    // Regex untuk mencari pola tanggal
    const dateMatch = raw_text ? raw_text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/) : null;
    const transaction_date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('en-US');

    // Mengambil baris tengah sebagai daftar item barang
    const items = lines.slice(1).filter(l => !l.match(/^(total|subtotal|tax|date)/i));

    // Mengembalikan data sesuai struktur yang diminta ScannerPage.tsx
    res.status(200).json({
      success: true,
      raw_text: raw_text || "Teks struk tidak terbaca",
      merchant_name,
      total_amount,
      transaction_date,
      items
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  detectAnomaly,
  processOCR
};