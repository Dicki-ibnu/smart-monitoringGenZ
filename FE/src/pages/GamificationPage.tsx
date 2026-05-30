import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { profilesApi } from '../lib/api';
import { Trophy, Palette, Coins, CheckCircle, Lock, Unlock, X, AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';

const AVAILABLE_THEMES = [
  { id: 'default', name: 'Cyber Maskulin', description: 'Gaya asli mode gelap emerald yang misterius.', price: 0, previewColor: 'bg-emerald-500' },
  { id: 'hellokitty', name: 'Cute Hello Kitty', description: 'Nuansa cerah pink pastel imut khas Hello Kitty.', price: 0, previewColor: 'bg-rose-400' },
  { id: 'sunset', name: 'Sunset Lo-Fi', description: 'Vibes senja santai dengan nuansa jingga hangat nan estetik.', price: 50, previewColor: 'bg-orange-500' },
  { id: 'galaxy', name: 'Midnight Galaxy', description: 'Tema ruang angkasa yang menenangkan dengan gradasi biru.', price: 100, previewColor: 'bg-indigo-500' },
  { id: 'sultan', name: 'Golden Sultan', description: 'Desain ultra premium dengan perpaduan warna hitam dan emas.', price: 200, previewColor: 'bg-amber-500' },
  { id: 'diamond', name: 'Diamond Zenith', description: 'Kasta dewa dengan kilau berlian biru es murni yang absolut.', price: 250, previewColor: 'bg-cyan-400' },
];

const getThemeStyles = (themeId: string) => {
  const styles: Record<string, any> = {
    hellokitty: { text: 'text-pink-500', bg: 'bg-pink-100', border: 'border-pink-200', solidBg: 'bg-pink-500', solidText: 'text-white', glow: 'shadow-[0_0_15px_rgba(244,114,182,0.3)]', activeBorder: 'border-pink-400' },
    sunset: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', solidBg: 'bg-orange-500', solidText: 'text-white', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]', activeBorder: 'border-orange-500/50' },
    galaxy: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', solidBg: 'bg-indigo-500', solidText: 'text-white', glow: 'shadow-[0_0_15px_rgba(99,102,241,0.3)]', activeBorder: 'border-indigo-500/50' },
    sultan: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', solidBg: 'bg-amber-500', solidText: 'text-slate-900', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]', activeBorder: 'border-amber-500/50' },
    diamond: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', solidBg: 'bg-cyan-400', solidText: 'text-slate-900', glow: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]', activeBorder: 'border-cyan-400/50' },
    default: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', solidBg: 'bg-emerald-500', solidText: 'text-slate-900', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]', activeBorder: 'border-emerald-500/50' }
  };
  return styles[themeId] || styles.default;
};

export default function GamificationPage() {
  const { user } = useAuth();
  const { theme, setTheme, activeStyle, isLight } = useTheme() as any;
  
  const [profile, setProfile] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [popup, setPopup] = useState<{
    isOpen: boolean; type: 'success' | 'error' | 'confirm'; title: string; message: string; onConfirm?: () => void;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const closePopup = () => setPopup(prev => ({ ...prev, isOpen: false }));

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
      setTheme(targetTheme.id as any);
      setPopup({ isOpen: true, type: 'success', title: 'Tema Diterapkan!', message: `Karakter ${targetTheme.name} sekarang aktif.` });
    } else {
      if (currentProfile.points >= targetTheme.price) {
        setPopup({
          isOpen: true, type: 'confirm', title: 'Konfirmasi Pembelian',
          message: `Apakah kamu yakin ingin menukar ${targetTheme.price} poin untuk tema ${targetTheme.name}?`,
          onConfirm: async () => {
            try {
              await profilesApi.unlockTheme(user.id, targetTheme.id, currentProfile.points - targetTheme.price, currentProfile.unlocked_themes || ['default']);
              setTheme(targetTheme.id as any);
              fetchData();
              setPopup({ isOpen: true, type: 'success', title: 'Pembelian Berhasil!', message: `Tema ${targetTheme.name} telah terbuka dan langsung diterapkan.` });
            } catch (err) {
              setPopup({ isOpen: true, type: 'error', title: 'Transaksi Gagal', message: 'Terjadi kesalahan pada server.' });
            }
          }
        });
      } else {
        setPopup({ isOpen: true, type: 'error', title: 'Poin Tidak Cukup!', message: `Kamu butuh ${targetTheme.price - currentProfile.points} poin lagi.` });
      }
    }
  };

  if (loading || !activeStyle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`w-8 h-8 border-2 ${activeStyle?.text || 'text-emerald-500'} border-t-transparent rounded-full animate-spin`} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 relative">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={clsx("text-2xl font-bold transition-colors", isLight ? "text-slate-800" : "text-white")}>Gamification & Rewards</h1>
          <p className={clsx("text-sm mt-1 transition-colors", isLight ? "text-slate-500" : "text-slate-400")}>Selesaikan misi, kumpulkan poin, dan buka tema eksklusif</p>
        </div>
      </div>

      {/* KARTU POIN UTAMA */}
      <div className={clsx(
        "rounded-2xl border p-6 transition-all hover:scale-[1.01] relative overflow-hidden",
        isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`
      )}>
        <div className="absolute -right-4 -top-8 opacity-[0.04] pointer-events-none">
          <Coins className={clsx("w-64 h-64", activeStyle.text)} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", activeStyle.bg)}>
                <Coins className={clsx("w-6 h-6", activeStyle.text)} />
              </div>
              <span className={clsx("text-xs font-bold uppercase tracking-widest", activeStyle.text)}>
                Dompet Poin Gen-Z
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <h1 className={clsx("text-5xl font-black transition-colors", isLight ? "text-slate-800" : "text-white")}>{profile?.points || 0}</h1>
              <span className={clsx("text-lg font-medium transition-colors", isLight ? "text-slate-500" : "text-slate-400")}>pts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* TOKO TEMA */}
          <div className={clsx("rounded-2xl border p-6 transition-all", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
            <h3 className={clsx("text-sm font-semibold mb-4 flex items-center gap-2", isLight ? "text-slate-800" : "text-white")}>
              <Palette className={clsx("w-4 h-4", activeStyle.text)} />
              Pilih Karakter Tema
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {AVAILABLE_THEMES.map((t) => {
                const isUnlocked = profile?.unlocked_themes?.includes(t.id) || t.price === 0;
                const isActive = theme === t.id;
                const tStyle = getThemeStyles(t.id);

                return (
                  <div key={t.id} className={clsx(
                    "rounded-xl border p-5 transition-all hover:scale-[1.02] flex flex-col",
                    isActive 
                      ? (isLight ? `bg-pink-50 ${activeStyle.activeBorder} ${activeStyle.glow}` : `bg-white/5 ${activeStyle.activeBorder} ${activeStyle.glow}`)
                      : (isLight ? "bg-white border-slate-200" : "bg-black/20 border-white/5 hover:border-white/10")
                  )}>
                    <div className="flex justify-between items-start mb-4">
                      <div className={clsx("w-12 h-12 rounded-xl shadow-lg ring-2", isLight ? "ring-white" : "ring-black/50", t.previewColor)} />
                      <div className={clsx("px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1", 
                        isUnlocked 
                          ? (isLight ? "bg-pink-100 text-pink-600 border-pink-200" : `${tStyle.bg} ${tStyle.text} ${tStyle.border}`)
                          : (isLight ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-black/40 text-slate-400 border-white/5")
                      )}>
                        {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {isUnlocked ? 'TERBUKA' : `${t.price} Pts`}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className={clsx("text-sm font-bold mb-1 transition-colors", isLight ? "text-slate-800" : "text-white")}>{t.name}</h4>
                      <p className={clsx("text-xs leading-relaxed transition-colors", isLight ? "text-slate-600" : "text-slate-400")}>{t.description}</p>
                    </div>
                    <button onClick={() => handleAction(t)} className={clsx(
                        "mt-5 w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                        isActive 
                          ? `${activeStyle.solidBg} ${activeStyle.solidText}`
                          : isUnlocked
                            ? (isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-white/10 text-white hover:bg-white/20")
                            : (isLight ? "bg-amber-50 text-amber-600 border border-amber-200" : `${tStyle.bg} ${tStyle.text} ${tStyle.border}`)
                      )}
                    >
                      {isActive ? (<><CheckCircle className="w-4 h-4" /> SEDANG AKTIF</>) : isUnlocked ? ("GUNAKAN TEMA") : (<><Coins className="w-4 h-4" /> BELI TEMA</>)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* LEADERBOARD */}
        <div className={clsx("rounded-2xl border p-6 h-fit sticky top-6 transition-all", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
          <h3 className={clsx("text-sm font-semibold mb-6 flex items-center gap-2", isLight ? "text-slate-800" : "text-white")}>
            <Trophy className={clsx("w-4 h-4", activeStyle.text)} />
            Top Gen-Z Rank
          </h3>
          <div className="space-y-3">
            {leaderboard.length > 0 ? leaderboard.map((p, i) => (
              <div key={p.id} className={clsx("flex items-center justify-between p-3 rounded-xl transition-colors", i === 0 ? activeStyle.bg : (isLight ? "hover:bg-slate-50" : "hover:bg-white/5"))}>
                <div className="flex items-center gap-3">
                  <span className={clsx("text-xs font-black w-5 text-center", i === 0 ? activeStyle.text : "text-slate-500")}>#{i + 1}</span>
                  <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ring-1", isLight ? "bg-pink-100 text-pink-600" : "bg-white/10 text-white")}>
                    {p.full_name?.substring(0,2).toUpperCase()}
                  </div>
                  <p className={clsx("text-sm font-medium", isLight ? "text-slate-700" : "text-slate-200")}>{p.full_name}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={clsx("text-sm font-bold", activeStyle.text)}>{p.points}</span>
                  <span className="text-[10px] text-slate-500">pts</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-8"><p className="text-sm text-slate-500">Belum ada data peringkat.</p></div>
            )}
          </div>
        </div>
      </div>
      
      {/* POPUP MODAL */}
      {popup.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={clsx("border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden", isLight ? "bg-white border-pink-200" : `${activeStyle.sidebarBg} border-white/10`)}>
            <div className={clsx("px-6 py-4 border-b border-white/10 flex items-center gap-3", popup.type === 'success' ? activeStyle.bg : "bg-black/20")}>
              {popup.type === 'success' && <CheckCircle className={clsx("w-6 h-6", activeStyle.text)} />}
              {popup.type === 'error' && <AlertTriangle className="w-6 h-6 text-rose-500" />}
              {popup.type === 'confirm' && <Info className="w-6 h-6 text-cyan-500" />}
              <h3 className={clsx("text-lg font-bold flex-1", isLight ? "text-slate-800" : "text-white")}>{popup.title}</h3>
              <button onClick={closePopup} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6"><p className={clsx("text-sm", isLight ? "text-slate-600" : "text-slate-300")}>{popup.message}</p></div>
            <div className="px-6 py-4 flex justify-end gap-3 border-t border-white/10 bg-black/40">
              {popup.type === 'confirm' ? (
                <>
                  <button onClick={closePopup} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors">Batal</button>
                  <button onClick={() => { if (popup.onConfirm) popup.onConfirm(); }} className={`px-4 py-2 rounded-xl text-sm font-bold ${activeStyle.solidBg} ${activeStyle.solidText}`}>Ya, Lanjutkan</button>
                </>
              ) : (
                <button onClick={closePopup} className={`px-5 py-2.5 rounded-xl text-sm font-bold ${activeStyle.solidBg} ${activeStyle.solidText}`}>Tutup</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}