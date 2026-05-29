import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { transactionsApi, insightsApi } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import type { Transaction, Insight } from '../types';
import {
  TrendingDown, TrendingUp, AlertTriangle, Target, PiggyBank, Zap, RefreshCw, CheckCircle, AlertCircle
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import clsx from 'clsx';

export default function InsightsPage() {
  const { user } = useAuth();
  const { activeStyle, isLight } = useTheme() as any; 
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // STATE BARU: Pop-Up Modal
  const [modalState, setModalState] = useState<{type: 'success' | 'warning' | 'error', title: string, message: string} | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [txRes, insRes] = await Promise.all([
        transactionsApi.list(user.id),
        insightsApi.list(user.id),
      ]);
      setTransactions(txRes.data || []);
      setInsights(insRes.data || []);
    } catch (err) {
      console.error('Failed to fetch insights data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  const monthTx = transactions.filter((t) =>
    isWithinInterval(new Date(t.date || new Date()), { start: monthStart, end: monthEnd })
  );

  const totalExpense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const totalIncome = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);

  const uniqueCategories = Array.from(new Set(monthTx.filter(t => t.type === 'expense').map(t => t.category || 'Uncategorized')));

  const radarData = uniqueCategories.map((catName) => {
    const total = monthTx
      .filter((t) => (t.category || 'Uncategorized') === catName && t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    return { category: catName, amount: total };
  }).filter((d) => d.amount > 0);

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(now, 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTx = transactions.filter((t) => (t.date || '').startsWith(dateStr));
    return {
      day: format(date, 'EEE'),
      expense: dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      income: dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  const generateInsights = async () => {
    if (!user) return;
    setGenerating(true);

    const newInsights: any[] = [];

    const expenseByCategory = uniqueCategories.map((catName) => ({
      name: catName,
      total: monthTx.filter((t) => (t.category || 'Uncategorized') === catName && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    })).sort((a, b) => b.total - a.total);

    if (expenseByCategory.length > 0 && expenseByCategory[0].total > 0) {
      const topCat = expenseByCategory[0];
      const pct = totalExpense > 0 ? Math.round((topCat.total / totalExpense) * 100) : 0;
      if (pct > 40) {
        newInsights.push({
          user_id: user.id,
          insight_type: 'spending_pattern',
          title: 'Pengeluaran Kategori Terlalu Besar!',
          message: `${topCat.name} menyedot ${pct}% dari total pengeluaranmu. Hati-hati, diversifikasikan budget-mu!`,
          severity: 'warning',
        });
      } else {
        newInsights.push({
          user_id: user.id,
          insight_type: 'spending_pattern',
          title: 'Distribusi Pengeluaran Sehat',
          message: `Pengeluaran terbesarmu ada di ${topCat.name} (${pct}%). Ini masih dalam batas aman.`,
          severity: 'info',
        });
      }
    }

    if (totalIncome > 0) {
      const savingsRate = Math.round(((totalIncome - totalExpense) / totalIncome) * 100);
      if (savingsRate < 10) {
        newInsights.push({
          user_id: user.id,
          insight_type: 'savings',
          title: 'Tabungan Sangat Kritis',
          message: `Kamu hanya menabung ${savingsRate}% bulan ini. Usahakan sisihkan minimal 20% di awal gajian ya!`,
          severity: 'critical',
        });
      } else if (savingsRate >= 20) {
        newInsights.push({
          user_id: user.id,
          insight_type: 'savings',
          title: 'Target Tabungan Tercapai!',
          message: `Luar biasa! Kamu berhasil menabung ${savingsRate}%. Pertahankan terus habit ini.`,
          severity: 'info',
        });
      }
    }

    if (newInsights.length === 0) {
      newInsights.push({
        user_id: user.id,
        insight_type: 'general_review',
        title: 'Kondisi Keuangan Stabil',
        message: 'Tidak ada pengeluaran ekstrem yang terdeteksi. Sistem melihat keuanganmu cukup terkendali bulan ini.',
        severity: 'info',
      });
    }

    try {
      await insightsApi.create(newInsights);
      setModalState({ type: 'success', title: 'Analisa Selesai!', message: 'AI telah berhasil membuat laporan keuangan terbarumu. Silakan cek di bawah.' });
    } catch (err) {
      setModalState({ type: 'error', title: 'Gagal', message: 'Gagal menyimpan hasil analisa ke database.' });
    }

    setGenerating(false);
    fetchData(); 
  };

  const markAsRead = async (id: string) => {
    try {
      await insightsApi.markRead(id);
      setInsights((prev) => prev.map((i) => i.id === id ? { ...i, is_read: true } : i));
    } catch (err) {}
  };

  if (loading || !activeStyle) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={clsx("text-2xl font-bold transition-colors duration-500", isLight ? "text-slate-800" : "text-white")}>Financial Insights</h1>
          <p className={clsx("text-sm mt-1 transition-colors duration-500", isLight ? "text-slate-500" : "text-slate-400")}>Data-driven recommendations based on your spending patterns</p>
        </div>
        <button
          onClick={generateInsights}
          disabled={generating}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 font-semibold rounded-xl transition-all text-sm disabled:opacity-50",
            activeStyle.solidBg, activeStyle.solidText, activeStyle.glow
          )}
        >
          {generating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Zap className="w-4 h-4" /> Generate Insights</>}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={clsx("rounded-2xl border p-5 transition-all duration-500 hover:scale-[1.02]", isLight ? "bg-white border-pink-100" : `${activeStyle.sidebarBg} border-white/5`)}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center"><TrendingDown className="w-5 h-5 text-red-500" /></div>
            <span className={clsx("text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-500" : "text-slate-400")}>Monthly Expense</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpense)}</p>
        </div>
        <div className={clsx("rounded-2xl border p-5 transition-all duration-500 hover:scale-[1.02]", isLight ? "bg-white border-pink-100" : `${activeStyle.sidebarBg} border-white/5`)}>
          <div className="flex items-center gap-3 mb-3">
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center", activeStyle.bg)}><TrendingUp className={clsx("w-5 h-5", activeStyle.text)} /></div>
            <span className={clsx("text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-500" : "text-slate-400")}>Monthly Income</span>
          </div>
          <p className={clsx("text-2xl font-bold", activeStyle.text)}>{formatCurrency(totalIncome)}</p>
        </div>
        <div className={clsx("rounded-2xl border p-5 transition-all duration-500 hover:scale-[1.02]", isLight ? "bg-white border-pink-100" : `${activeStyle.sidebarBg} border-white/5`)}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center"><PiggyBank className="w-5 h-5 text-cyan-500" /></div>
            <span className={clsx("text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-500" : "text-slate-400")}>Savings Rate</span>
          </div>
          <p className="text-2xl font-bold text-cyan-500">{totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <div className={clsx("rounded-2xl border p-6 transition-all duration-500", isLight ? "bg-white border-pink-100" : `${activeStyle.sidebarBg} border-white/5`)}>
          <h3 className={clsx("text-sm font-semibold mb-4 flex items-center gap-2", isLight ? "text-slate-800" : "text-white")}>
            <Target className={clsx("w-4 h-4", activeStyle.text)} /> Spending Profile
          </h3>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={isLight ? "#fbcfe8" : "rgba(255,255,255,0.1)"} />
                <PolarAngleAxis dataKey="category" tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: isLight ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                <Radar name="Spending" dataKey="amount" stroke={isLight ? "#ec4899" : "#10b981"} fill={isLight ? "#ec4899" : "#10b981"} fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className={clsx("flex items-center justify-center h-[280px] text-sm", isLight ? "text-slate-400" : "text-slate-500")}>No categorized spending yet</div>
          )}
        </div>

        {/* Weekly Trend */}
        <div className={clsx("rounded-2xl border p-6 transition-all duration-500", isLight ? "bg-white border-pink-100" : `${activeStyle.sidebarBg} border-white/5`)}>
          <h3 className={clsx("text-sm font-semibold mb-4 flex items-center gap-2", isLight ? "text-slate-800" : "text-white")}>
            <TrendingUp className="w-4 h-4 text-cyan-400" /> Weekly Trend
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#fbcfe8" : "rgba(255,255,255,0.1)"} />
              <XAxis dataKey="day" stroke={isLight ? "#94a3b8" : "#64748b"} tick={{ fontSize: 11 }} />
              <YAxis stroke={isLight ? "#94a3b8" : "#64748b"} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: isLight ? '#ffffff' : '#0f172a', border: isLight ? '1px solid #fbcfe8' : '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 13 }} />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />
              <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Generated Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className={clsx("text-sm font-semibold mt-4", isLight ? "text-slate-800" : "text-white")}>Saran & Analisa AI Terbaru</h3>
          {insights.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((insight) => (
            <div key={insight.id} className={clsx(
              "rounded-2xl border p-5 transition-all duration-500 hover:translate-x-1",
              isLight ? "bg-white" : activeStyle.sidebarBg,
              insight.severity === 'critical' ? 'border-red-500/30' : insight.severity === 'warning' ? 'border-amber-500/30' : isLight ? 'border-pink-200' : 'border-white/10',
              insight.is_read ? 'opacity-60' : ''
            )}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  insight.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                  insight.severity === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-cyan-500/10 text-cyan-500'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      insight.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                      insight.severity === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-cyan-500/10 text-cyan-500'
                    }`}>
                      {insight.insight_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">{format(new Date(insight.created_at), 'MMM d, HH:mm')}</span>
                  </div>
                  <p className={clsx("text-sm font-bold", isLight ? "text-slate-800" : "text-white")}>{insight.title}</p>
                  <p className={clsx("text-sm mt-1", isLight ? "text-slate-600" : "text-slate-400")}>{insight.message}</p>
                </div>
                {!insight.is_read && (
                  <button onClick={() => markAsRead(insight.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">Tutup</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* POP-UP MODAL */}
      {modalState && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={clsx("rounded-3xl p-6 max-w-sm w-full shadow-2xl transform transition-all border text-center", isLight ? "bg-white border-pink-100" : "bg-slate-900 border-slate-800")}>
            <div className="flex justify-center mb-4">
              {modalState.type === 'success' && (
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 shadow-inner">
                  <CheckCircle className="w-8 h-8" />
                </div>
              )}
              {modalState.type === 'error' && (
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-500 shadow-inner">
                  <AlertCircle className="w-8 h-8" />
                </div>
              )}
            </div>
            <h3 className={clsx("text-xl font-bold mb-2", isLight ? "text-slate-800" : "text-white")}>{modalState.title}</h3>
            <p className={clsx("text-sm mb-6", isLight ? "text-slate-500" : "text-slate-400")}>{modalState.message}</p>
            <button onClick={() => setModalState(null)} className={clsx("w-full py-3 rounded-xl font-bold text-sm transition-transform active:scale-95", activeStyle.solidBg, activeStyle.solidText)}>
              Oke, Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}