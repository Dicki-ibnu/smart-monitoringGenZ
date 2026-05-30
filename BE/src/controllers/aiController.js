require('dotenv').config(); 

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// 1. DEKLARASI SUPABASE 
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY;
let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.log("PERINGATAN: SUPABASE_URL atau KEY tidak ditemukan di file .env!");
}

// ========================================================
// 1. ENGINE ANOMALI (Z-SCORE)
// ========================================================
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
    const stdDev = Math.sqrt(variance) || 1; 

    const anomalies = [];
    expenses.forEach(tx => {
      const zScore = Math.abs((tx.amount - mean) / stdDev);
      if (zScore > 2) {
        anomalies.push({
          transaction_id: tx.id,
          z_score: parseFloat(zScore.toFixed(2)), 
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

// ========================================================
// 2. OCR SCANNER (Koneksi Python + Upload ke Supabase Storage)
// ========================================================
const processOCR = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Tidak ada gambar struk yang di-upload!" });
  }

  try {
    console.log("1. Mengirim gambar struk ke AI Python...");
    
    const form = new FormData();
    form.append('image', fs.createReadStream(req.file.path), req.file.originalname);

    const pythonResponse = await axios.post('http://127.0.0.1:5001/api/scan-receipt', form, {
      headers: { ...form.getHeaders() }
    });

    const aiData = pythonResponse.data.data;
    
    console.log("2. OCR Sukses. Mengunggah gambar ke Supabase Storage...");
    
    let receiptUrl = null;
    
    // 2. MEMANGGIL VARIABEL SUPABASE YANG SUDAH DIDEKLARASIKAN
    if (supabase) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileName = `receipts/${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`; 

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error("Peringatan: Gagal upload gambar ke Supabase:", uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);
          
        receiptUrl = publicUrlData.publicUrl;
        console.log("3. Gambar berhasil diamankan di Cloud!");
      }
    } else {
      console.log("Upload ke Supabase dibatalkan karena config di .env belum benar.");
    }

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(200).json({
      success: true,
      merchant_name: aiData.merchant,
      total_amount: aiData.total,
      payment_method: aiData.payment_method,
      receipt_url: receiptUrl 
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Gagal memproses AI / Upload:", error.message);
    res.status(500).json({ success: false, message: "Gagal memproses struk dengan AI" });
  }
};

module.exports = {
  detectAnomaly,
  processOCR
};