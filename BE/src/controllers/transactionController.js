const supabase = require('../config/supabaseClient');
const redisClient = require('../config/redisClient');
const { sendToQueue } = require('../config/rabbitmq');

// 1. Fungsi Ambil Data (GET)
const getTransactions = async (req, res) => {
    try {
        // Gunakan ID asli 
        const userId = req.user ? req.user.id : 'd7628eef-242e-4142-80d4-cb8fadba041b'; 
        const cacheKey = `dashboard_data_${userId}`;

        // Langkah 1: Cek apakah data sudah ada di Redis
        const cachedData = await redisClient.get(cacheKey);
        
        if (cachedData) {
            console.log('Data ngebut diambil dari Redis Cache!');
            return res.status(200).json({
                message: 'Berhasil mengambil data transaksi',
                source: 'Redis Cache',
                data: JSON.parse(cachedData)
            });
        }

        // Langkah 2: Kalau Redis kosong, baru nanya ke Supabase yang lebih lambat
        console.log('🔍 Mengambil data asli dari Supabase...');
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false }); // Urutkan dari yang terbaru

        if (error) throw error;

        // Langkah 3: Simpan jawaban Supabase ke Redis biar pencarian berikutnya langsung cepat!
        // Parameter 3600 = data akan disimpan di cache selama 1 jam (dalam hitungan detik)
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(data));

        // Langkah 4: Kembalikan data ke Frontend
        return res.status(200).json({
            message: 'Berhasil mengambil data transaksi',
            source: 'Supabase Database',
            data: data
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// 2. Fungsi Tambah Data (POST)
const addTransaction = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : 'd7628eef-242e-4142-80d4-cb8fadba041b';
        
        // PERBAIKAN 1: Tambahkan type dan source yang sebelumnya tertinggal
        const { type, amount, category, description, source, date, is_ocr, image_url } = req.body;

        // Simpan ke Supabase dengan nama kolom yang lengkap dan benar
        const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert([{ 
                user_id: userId, 
                type: type,             // Wajib ada
                amount: amount, 
                category: category,          
                description: description,     
                source: source,         // Wajib ada
                date: date, 
                is_ocr: is_ocr || false,              
                image_url: image_url 
            }])
            .select();

        if (txError) throw txError;

        // Hapus Cache Redis (Karena ada data baru, cache lama harus dibuang)
        const cacheKey = `dashboard_data_${userId}`;
        if (typeof redisClient !== 'undefined') {
            await redisClient.del(cacheKey);
            console.log('🧹 Cache Redis dibersihkan karena ada transaksi baru');
        }

        // --- SISTEM POIN GAMIFIKASI ---
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('points')
                .eq('id', userId)
                .single();

            const currentPoints = profile?.points || 0;
            const poinDidapat = 10;

            await supabase
                .from('profiles')
                .update({ points: currentPoints + poinDidapat })
                .eq('id', userId);

            console.log(`🎮 User dapat +${poinDidapat} Poin! Total sekarang: ${currentPoints + poinDidapat}`);
        } catch (pointError) {
            console.error('Gagal menambahkan poin:', pointError.message);
        }

        // ==========================================
        // PERBAIKAN 2: INTEGRASI RABBITMQ UNTUK OCR
        // ==========================================
        // Jika transaksi ini berasal dari upload struk (Scanner), lempar fotonya ke AI!
        if (is_ocr && image_url) {
            try {
                sendToQueue('ocr_tasks', { 
                    transaction_id: transaction[0].id, 
                    user_id: userId,
                    image_url: image_url,
                    timestamp: new Date()
                });
                console.log(`[RabbitMQ] Tugas baca struk (OCR) dikirim ke antrean!`);
            } catch (qErr) {
                console.error('[RabbitMQ] Gagal mengirim ke antrean:', qErr.message);
            }
        }

        return res.status(201).json({
            message: 'Transaksi berhasil disimpan dan poin bertambah!',
            data: transaction
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

module.exports = { getTransactions, addTransaction };