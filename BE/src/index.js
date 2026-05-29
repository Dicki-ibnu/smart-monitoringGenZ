const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. Import konfigurasi RabbitMQ (Baru ditambahkan)
const { connectRabbitMQ } = require('./config/rabbitmq'); 

// Import kumpulan rute API
const apiRoutes = require('./routes/api');
// Taruh di bagian atas bareng import rute yang lain
const profileRoutes = require('./routes/profileRoutes');

const app = express();
const PORT = process.env.PORT || 5000; 

// Middleware Agar bisa menerima data JSON dan tidak diblokir React
app.use(cors());
app.use(express.json());

// Sambungkan rute API
app.use('/api', apiRoutes);
app.use('/api/profiles', profileRoutes);

// Jalankan Server
app.listen(PORT, async () => {
  console.log(`Server Back-End berjalan di http://localhost:${PORT}`);
  // Nyalakan koneksi RabbitMQ 
  if (connectRabbitMQ) {
    try {
      await connectRabbitMQ();
      console.log('RabbitMQ berhasil disambungkan!');
    } catch (err) {
      console.error('Gagal menyambungkan RabbitMQ:', err.message);
    }
  }
});