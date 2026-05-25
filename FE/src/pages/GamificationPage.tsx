import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { profilesApi } from '../lib/api';
import { Trophy, Palette, Target, Star, Coins } from 'lucide-react';
import clsx from 'clsx'; 

const AVAILABLE_THEMES = [
  { id: 'default', name: 'Cyber Maskulin', description: 'Gaya asli mode gelap emerald yang misterius.', price: 0, previewColor: 'bg-emerald-500' },
  { id: 'hellokitty', name: 'Cute Hello Kitty', description: 'Nuansa cerah pink pastel imut khas Hello Kitty.', price: 0, previewColor: 'bg-rose-400' },
  { id: 'ocean', name: 'Ocean Blue', description: 'Gaya dinamis biru laut ala eFootball.', price: 100, previewColor: 'bg-blue-600' },
  { id: 'anime', name: 'Anime Vaporwave', description: 'Estetika ungu neon ala visual anime modern.', price: 200, previewColor: 'bg-purple-500' },
];

export default function GamificationPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const profData = await profilesApi.get(user.id);
      const leaderData = await profilesApi.getLeaderboard();
      setProfile(profData);
      setLeaderboard(leaderData.data || []);
    } catch (err) {
      console.error('Gagal mengambil data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (targetTheme: any) => {
    if (!user) return;
    const currentProfile = profile || { points: 0, unlocked_themes: ['default'] };
    const isUnlocked = currentProfile.unlocked_themes?.includes(targetTheme.id) || targetTheme.price === 0;

    if (isUnlocked) {
      // LANGSUNG GANTI TEMA
      setTheme(targetTheme.id as any);
      alert(`Tema ${targetTheme.name} diterapkan!`);
    } else {
      // BELI TEMA
      if (currentProfile.points >= targetTheme.price) {
        if (window.confirm(`Beli ${targetTheme.name} seharga ${targetTheme.price} Poin?`)) {
          await profilesApi.unlockTheme(user.id, targetTheme.id, currentProfile.points - targetTheme.price, currentProfile.unlocked_themes);
          setTheme(targetTheme.id as any);
          alert("Pembelian Berhasil!");
          fetchData();
        }
      } else {
        alert("Poin tidak cukup!");
      }
    }
  };

  if (loading) return <div className="p-10 text-center text-white">Loading...</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* Kartu Poin */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-8 shadow-xl text-white">
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Dompet Poin Gen-Z</p>
        <div className="flex items-center gap-3 mt-1">
          <Coins className="w-10 h-10 text-amber-200" />
          <h1 className="text-5xl font-black">{profile?.points || 0} <span className="text-xl font-normal opacity-70">pts</span></h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Toko Tema */}
          <section>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-cyan-400" /> Pilih Karakter Kamu
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AVAILABLE_THEMES.map((t) => (
                <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className={clsx("w-12 h-12 rounded-xl shadow-lg", t.previewColor)} />
                    <span className="text-amber-400 font-bold text-sm flex items-center gap-1">
                      {profile?.unlocked_themes?.includes(t.id) || t.price === 0 ? 'TERBUKA' : `${t.price} Pts`}
                    </span>
                  </div>
                  <h3 className="font-bold text-white">{t.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">{t.description}</p>
                  <button
                    onClick={() => handleAction(t)}
                    className={clsx(
                      "mt-4 w-full py-2.5 rounded-xl text-xs font-black transition-all",
                      theme === t.id ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    )}
                  >
                    {theme === t.id ? "SEDANG AKTIF" : "GUNAKAN TEMA"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Misi Harian */}
          <section>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-rose-400" /> Misi Harian (Dapatkan Poin)
            </h2>
            <div className="space-y-3">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-500">
                <div className="flex items-center gap-4">
                  <Star className="w-6 h-6 text-amber-400" />
                  <div>
                    <p className="text-sm font-bold text-white">Master Scanner</p>
                    <p className="text-xs text-slate-500">Scan struk belanja pertamamu hari ini</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-bold text-emerald-400">+50 Poin</span>
                  <span className="text-[10px] text-slate-600">0/1 Selesai</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Leaderboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-fit">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-amber-400" /> Top Gen-Z
          </h2>
          <div className="space-y-4">
            {leaderboard.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 w-4">{i+1}</span>
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold">
                    {p.full_name?.substring(0,2).toUpperCase()}
                  </div>
                  <p className="text-sm text-slate-300 font-medium">{p.full_name}</p>
                </div>
                <p className="text-sm font-bold text-emerald-400">{p.points}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}