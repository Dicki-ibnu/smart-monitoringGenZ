import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { transactionsApi, categoriesApi, anomalyAlertsApi } from '../lib/api';
import { useTheme } from '../context/ThemeContext'; // IMPORT THEME
import type { Transaction, Category, AnomalyAlert } from '../types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import {
  TrendingDown, TrendingUp, ShieldAlert, Wallet, ArrowUpRight,
  CreditCard, Smartphone, Banknote
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, subDays } from 'date-fns';
import clsx from 'clsx'; // IMPORT CLSX

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  'e-wallet': <Smartphone className="w-4 h-4" />,
  'mobile-banking': <CreditCard className="w-4 h-4" />,
  'cash': <Banknote className="w-4 h-4" />,
  'debit-card': <CreditCard className="w-4 h-4" />,
  'credit-card': <CreditCard className="w-4 h-4" />,
  'transfer': <ArrowUpRight className="w-4 h-4" />,
};

const CHART_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeStyle, isLight } = useTheme() as any; // AMBIL TEMA

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    async function fetchData() {
      try {
        const [txRes, catRes, alertRes] = await Promise.all([
          transactionsApi.list(userId),
          categoriesApi.list(userId),
          anomalyAlertsApi.list(userId),
        ]);
        setTransactions(txRes.data || []);
        setCategories(catRes.data || []);
        setAlerts(alertRes.data || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthTransactions = transactions.filter((t) =>
    isWithinInterval(new Date(t.date || new Date()), { start: monthStart, end: monthEnd })
  );

  const totalExpense = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const totalIncome = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const anomalyCount = monthTransactions.filter((t) => t.is_anomaly).length;

  const dailyData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(now, 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTx = transactions.filter((t) => (t.date || '').startsWith(dateStr) && t.type === 'expense');
    return {
      date: format(date, 'MMM d'),
      expense: dayTx.reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  const categoryData = categories
    .filter((c) => c.type === 'expense')
    .map((cat) => {
      const total = monthTransactions
        .filter((t) => t.category === cat.name && t.type === 'expense') // PERBAIKAN: gunakan cat.name
        .reduce((s, t) => s + Number(t.amount), 0);
      return { name: cat.name, value: total, color: cat.color };
    })
    .filter((c) => c.value > 0);

  const sourceData = ['e-wallet', 'mobile-banking', 'cash', 'debit-card', 'credit-card', 'transfer'].map((source) => ({
    source: source.replace('-', ' '),
    amount: monthTransactions
      .filter((t) => t.source === source && t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0),
  })).filter((s) => s.amount > 0);

  if (loading || !activeStyle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`w-8 h-8 border-2 ${activeStyle?.text || 'text-emerald-500'} border-t-transparent rounded-full animate-spin`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={clsx("text-2xl font-bold transition-colors duration-500", isLight ? "text-slate-800" : "text-white")}>
          Dashboard
        </h1>
        <p className={clsx("text-sm mt-1 transition-colors duration-500", isLight ? "text-slate-500" : "text-slate-400")}>
          Your financial overview for {format(now, 'MMMM yyyy')}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Expenses" value={totalExpense} icon={<TrendingDown className="w-5 h-5" />} color="red" isLight={isLight} activeStyle={activeStyle} />
        <StatCard title="Total Income" value={totalIncome} icon={<TrendingUp className="w-5 h-5" />} color="emerald" isLight={isLight} activeStyle={activeStyle} />
        <StatCard title="Anomalies" value={anomalyCount} icon={<ShieldAlert className="w-5 h-5" />} color="amber" isCount isLight={isLight} activeStyle={activeStyle} />
        <StatCard title="Net Balance" value={totalIncome - totalExpense} icon={<Wallet className="w-5 h-5" />} color="cyan" isLight={isLight} activeStyle={activeStyle} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Spending Trend */}
        <div className={clsx("lg:col-span-2 rounded-2xl border p-6 transition-all duration-500", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
          <h3 className={clsx("text-sm font-semibold mb-4", isLight ? "text-slate-800" : "text-white")}>Spending Trend (30 Days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isLight ? "#ec4899" : "#10b981"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isLight ? "#ec4899" : "#10b981"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#fbcfe8" : "rgba(255,255,255,0.05)"} />
              <XAxis dataKey="date" stroke={isLight ? "#94a3b8" : "#64748b"} tick={{ fontSize: 11 }} />
              <YAxis stroke={isLight ? "#94a3b8" : "#64748b"} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: isLight ? '#ffffff' : '#0f172a', border: isLight ? '1px solid #fbcfe8' : '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 13 }}
                labelStyle={{ color: isLight ? '#64748b' : '#94a3b8' }}
                itemStyle={{ color: isLight ? '#ec4899' : '#10b981' }}
              />
              <Area type="monotone" dataKey="expense" stroke={isLight ? "#ec4899" : "#10b981"} fill="url(#colorExpense)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className={clsx("rounded-2xl border p-6 transition-all duration-500", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
          <h3 className={clsx("text-sm font-semibold mb-4", isLight ? "text-slate-800" : "text-white")}>Category Breakdown</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: isLight ? '#ffffff' : '#0f172a', border: isLight ? '1px solid #fbcfe8' : '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 13 }}
                  itemStyle={{ color: isLight ? '#475569' : '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={clsx("flex items-center justify-center h-[260px] text-sm", isLight ? "text-slate-400" : "text-slate-500")}>No expense data yet</div>
          )}
          <div className="mt-2 space-y-1.5">
            {categoryData.slice(0, 4).map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color || CHART_COLORS[i] }} />
                  <span className={clsx(isLight ? "text-slate-600" : "text-slate-400")}>{cat.name}</span>
                </div>
                <span className={clsx("font-medium", isLight ? "text-slate-800" : "text-white")}>{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Source Breakdown + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source Breakdown */}
        <div className={clsx("rounded-2xl border p-6 transition-all duration-500", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
          <h3 className={clsx("text-sm font-semibold mb-4", isLight ? "text-slate-800" : "text-white")}>Spending by Source</h3>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#fbcfe8" : "rgba(255,255,255,0.05)"} />
                <XAxis dataKey="source" stroke={isLight ? "#94a3b8" : "#64748b"} tick={{ fontSize: 10 }} />
                <YAxis stroke={isLight ? "#94a3b8" : "#64748b"} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: isLight ? '#ffffff' : '#0f172a', border: isLight ? '1px solid #fbcfe8' : '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 13 }}
                  itemStyle={{ color: isLight ? '#0ea5e9' : '#06b6d4' }}
                />
                <Bar dataKey="amount" fill={isLight ? "#0ea5e9" : "#06b6d4"} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className={clsx("flex items-center justify-center h-[240px] text-sm", isLight ? "text-slate-400" : "text-slate-500")}>No source data yet</div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className={clsx("rounded-2xl border p-6 transition-all duration-500", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
          <h3 className={clsx("text-sm font-semibold mb-4", isLight ? "text-slate-800" : "text-white")}>Recent Transactions</h3>
          <div className="space-y-3">
            {transactions.slice(0, 6).map((tx) => (
              <div key={tx.id} className={clsx("flex items-center gap-3 p-2 rounded-xl transition-colors", isLight ? "hover:bg-pink-50" : "hover:bg-slate-800/50")}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  tx.type === 'expense' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {SOURCE_ICONS[tx.source] || <CreditCard className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx("text-sm truncate font-medium", isLight ? "text-slate-800" : "text-white")}>{tx.description || 'Transaction'}</p>
                  <p className={clsx("text-xs", isLight ? "text-slate-500" : "text-slate-400")}>{format(new Date(tx.date), 'MMM d')} &middot; {tx.source.replace('-', ' ')}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                  {tx.type === 'expense' ? '-' : '+'}{formatCurrency(Number(tx.amount))}
                </span>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className={clsx("text-sm text-center py-8", isLight ? "text-slate-400" : "text-slate-500")}>No transactions yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.filter((a) => !a.is_resolved).length > 0 && (
        <div className={clsx("rounded-2xl border p-6 transition-all duration-500", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
          <h3 className={clsx("text-sm font-semibold mb-4 flex items-center gap-2", isLight ? "text-slate-800" : "text-white")}>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Active Anomaly Alerts
          </h3>
          <div className="space-y-2">
            {alerts.filter((a) => !a.is_resolved).slice(0, 5).map((alert) => (
              <div key={alert.id} className={clsx(
                "flex items-center gap-3 p-3 rounded-xl border",
                alert.severity === 'high' ? 'bg-red-500/5 border-red-500/20' :
                alert.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/20' :
                isLight ? 'bg-slate-50 border-pink-100' : 'bg-slate-800/50 border-slate-700'
              )}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  alert.severity === 'high' ? 'bg-red-400' :
                  alert.severity === 'medium' ? 'bg-amber-400' : 'bg-slate-400'
                }`} />
                <div className="flex-1">
                  <p className={clsx("text-sm font-medium", isLight ? "text-slate-800" : "text-white")}>{alert.message}</p>
                  <p className={clsx("text-xs mt-0.5", isLight ? "text-slate-500" : "text-slate-400")}>{alert.alert_type.replace('_', ' ')} &middot; {format(new Date(alert.created_at), 'MMM d, HH:mm')}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  alert.severity === 'high' ? 'bg-red-500/10 text-red-500' :
                  alert.severity === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                  isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-700 text-slate-400'
                }`}>
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color, isCount, isLight, activeStyle }: any) {
  const colorMap: any = {
    red: 'from-red-500/10 to-red-500/5 border-red-500/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20',
  };
  const iconBgMap: any = {
    red: 'bg-red-500/10 text-red-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    amber: 'bg-amber-500/10 text-amber-500',
    cyan: 'bg-cyan-500/10 text-cyan-500',
  };
  const textMap: any = { red: 'text-red-500', emerald: 'text-emerald-500', amber: 'text-amber-500', cyan: 'text-cyan-500' };

  return (
    <div className={clsx(
      "bg-gradient-to-br border rounded-2xl p-5 transition-transform hover:scale-[1.02]",
      colorMap[color],
      isLight && "bg-white shadow-sm border-pink-100" // Tambahan agar bagus di light mode
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className={clsx("text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-500" : "text-slate-400")}>{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBgMap[color]}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold ${textMap[color]}`}>
        {isCount ? value : formatCurrency(value)}
      </p>
    </div>
  );
}

function formatCurrency(amount: number): string {
  // SUDAH DIUBAH KE FORMAT RUPIAH
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}