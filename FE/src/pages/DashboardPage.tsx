import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { transactionsApi, categoriesApi, anomalyAlertsApi } from '../lib/api';
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
    isWithinInterval(new Date(t.transaction_date), { start: monthStart, end: monthEnd })
  );

  const totalExpense = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const totalIncome = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const anomalyCount = monthTransactions.filter((t) => t.is_anomaly).length;

  const dailyData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(now, 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTx = transactions.filter((t) => t.transaction_date === dateStr && t.type === 'expense');
    return {
      date: format(date, 'MMM d'),
      expense: dayTx.reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  const categoryData = categories
    .filter((c) => c.type === 'expense')
    .map((cat) => {
      const total = monthTransactions
        .filter((t) => t.category_id === cat.id && t.type === 'expense')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Your financial overview for {format(now, 'MMMM yyyy')}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Expenses" value={totalExpense} icon={<TrendingDown className="w-5 h-5" />} color="red" />
        <StatCard title="Total Income" value={totalIncome} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
        <StatCard title="Anomalies" value={anomalyCount} icon={<ShieldAlert className="w-5 h-5" />} color="amber" isCount />
        <StatCard title="Net Balance" value={totalIncome - totalExpense} icon={<Wallet className="w-5 h-5" />} color="cyan" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Spending Trend */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Spending Trend (30 Days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 13 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Area type="monotone" dataKey="expense" stroke="#10b981" fill="url(#colorExpense)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Category Breakdown</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={index} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 13 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-slate-500 text-sm">No expense data yet</div>
          )}
          <div className="mt-2 space-y-1.5">
            {categoryData.slice(0, 4).map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color || CHART_COLORS[i] }} />
                  <span className="text-slate-400">{cat.name}</span>
                </div>
                <span className="text-white font-medium">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Source Breakdown + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source Breakdown */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Spending by Source</h3>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="source" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 13 }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Bar dataKey="amount" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-slate-500 text-sm">No source data yet</div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {transactions.slice(0, 6).map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/50 transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  tx.type === 'expense' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {SOURCE_ICONS[tx.source] || <CreditCard className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{tx.description || 'Transaction'}</p>
                  <p className="text-xs text-slate-500">{format(new Date(tx.transaction_date), 'MMM d')} &middot; {tx.source.replace('-', ' ')}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                  {tx.type === 'expense' ? '-' : '+'}{formatCurrency(Number(tx.amount))}
                </span>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">No transactions yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.filter((a) => !a.is_resolved).length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            Active Anomaly Alerts
          </h3>
          <div className="space-y-2">
            {alerts.filter((a) => !a.is_resolved).slice(0, 5).map((alert) => (
              <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                alert.severity === 'high' ? 'bg-red-500/5 border-red-500/20' :
                alert.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/20' :
                'bg-slate-800/50 border-slate-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  alert.severity === 'high' ? 'bg-red-400' :
                  alert.severity === 'medium' ? 'bg-amber-400' : 'bg-slate-400'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-white">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{alert.alert_type.replace('_', ' ')} &middot; {format(new Date(alert.created_at), 'MMM d, HH:mm')}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  alert.severity === 'high' ? 'bg-red-500/10 text-red-400' :
                  alert.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-slate-700 text-slate-400'
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

function StatCard({ title, value, icon, color, isCount }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'red' | 'emerald' | 'amber' | 'cyan';
  isCount?: boolean;
}) {
  const colorMap = {
    red: 'from-red-500/10 to-red-500/5 border-red-500/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20',
  };
  const iconBgMap = {
    red: 'bg-red-500/10 text-red-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
  };
  const textMap = { red: 'text-red-400', emerald: 'text-emerald-400', amber: 'text-amber-400', cyan: 'text-cyan-400' };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-5 transition-transform hover:scale-[1.02]`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}