const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import kumpulan rute API
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware Agar bisa menerima data JSON dan tidak diblokir React
app.use(cors());
app.use(express.json());

// Sambungkan rute API
app.use('/api', apiRoutes);

// Jalankan Server
app.listen(PORT, () => {
  console.log(` Server Back-End berjalan http://localhost:${PORT}`);
});