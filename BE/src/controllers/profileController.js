const supabase = require('../config/supabaseClient');

// 1. Ambil Data Profil & Saldo Poin User Saat Ini
const getProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// 2. Ambil Top 5 User untuk Leaderboard
const getLeaderboard = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, points')
            .order('points', { ascending: false })
            .limit(5); // Nampilin Top 5

        if (error) throw error;
        return res.status(200).json({ data });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// 3. Proses Pembelian Tema
const unlockTheme = async (req, res) => {
    try {
        const { id } = req.params;
        const { theme_id, remaining_points, unlocked_themes } = req.body;

        // Tambahkan tema baru ke daftar yang sudah terbuka
        const newUnlockedThemes = [...new Set([...unlocked_themes, theme_id])];

        const { data, error } = await supabase
            .from('profiles')
            .update({ 
                points: remaining_points, 
                unlocked_themes: newUnlockedThemes 
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        return res.status(200).json({ message: 'Tema berhasil dibeli!', data });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

module.exports = { getProfile, getLeaderboard, unlockTheme };