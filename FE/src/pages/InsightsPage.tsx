import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { transactionsApi, categoriesApi, insightsApi, profilesApi } from '../lib/api';
import type { Transaction, Category, Insight } from '../types';
import {
  Lightbulb, TrendingDown, TrendingUp, AlertTriangle, Info,
  Target, PiggyBank, Zap, RefreshCw,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

export default function InsightsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [txRes, catRes, insRes] = await Promise.all([
        transactionsApi.list(user.id),
        categoriesApi.list(user.id),
        insightsApi.list(user.id),
      ]);
      setTransactions(txRes.data || []);
      setCategories(catRes.data || []);
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
    isWithinInterval(new Date(t.transaction_date), { start: monthStart, end: monthEnd })
  );

  const totalExpense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const totalIncome = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);

  const radarData = categories
    .filter((c) => c.type === 'expense')
    .map((cat) => {
      const total = monthTx
        .filter((t) => t.category_id === cat.id && t.type === 'expense')
        .reduce((s, t) => s + Number(t.amount), 0);
      return { category: cat.name, amount: total };
    })
    .filter((d) => d.amount > 0);

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(now, 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTx = transactions.filter((t) => t.transaction_date === dateStr);
    return {
      day: format(date, 'EEE'),
      expense: dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      income: dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  const generateInsights = async () => {
    if (!user) return;
    setGenerating(true);

    const newInsights: { user_id: string; insight_type: string; title: string; message: string; severity: 'info' | 'warning' | 'critical' }[] = [];

    const expenseByCategory = categories
      .filter((c) => c.type === 'expense')
      .map((cat) => ({
        name: cat.name,
        total: monthTx.filter((t) => t.category_id === cat.id && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      }))
      .sort((a, b) => b.total - a.total);

    if (expenseByCategory.length > 0 && expenseByCategory[0].total > 0) {
      const topCat = expenseByCategory[0];
      const pct = totalExpense > 0 ? Math.round((topCat.total / totalExpense) * 100) : 0;
      if (pct > 40) {
        newInsights.push({
          user_id: user.id,
          insight_type: 'spending_pattern',
          title: 'High Category Concentration',
          message: `${topCat.name} accounts for ${pct}% of your spending. Consider diversifying your budget to reduce risk.`,
          severity: 'warning',
        });
      } else {
        newInsights.push({
          user_id: user.id,
          insight_type: 'spending_pattern',
          title: 'Spending Distribution',
          message: `Your top spending category is ${topCat.name} at ${pct}% of total expenses. This is within a healthy range.`,
          severity: 'info',
        });
      }
    }

    try {
      const profile = await profilesApi.get(user.id);
      const budget = Number(profile?.monthly_budget || 0);
      if (budget > 0) {
        const budgetUsed = Math.round((totalExpense / budget) * 100);
        if (budgetUsed > 90) {
          newInsights.push({
            user_id: user.id,
            insight_type: 'budget_alert',
            title: 'Budget Nearly Exceeded',
            message: `You've used ${budgetUsed}% of your monthly budget. Consider reducing non-essential spending for the rest of the month.`,
            severity: 'critical',
          });
        } else if (budgetUsed > 70) {
          newInsights.push({
            user_id: user.id,
            insight_type: 'budget_alert',
            title: 'Budget Warning',
            message: `You've used ${budgetUsed}% of your monthly budget. You have ${formatCurrency(budget - totalExpense)} remaining.`,
            severity: 'warning',
          });
        } else {
          newInsights.push({
            user_id: user.id,
            insight_type: 'budget_alert',
            title: 'On Track',
            message: `You've used ${budgetUsed}% of your monthly budget. Great job managing your spending!`,
            severity: 'info',
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    }

    if (totalIncome > 0) {
      const savingsRate = Math.round(((totalIncome - totalExpense) / totalIncome) * 100);
      if (savingsRate < 10) {
        newInsights.push({
          user_id: user.id,
          insight_type: 'savings',
          title: 'Low Savings Rate',
          message: `Your savings rate is ${savingsRate}%. Financial experts recommend saving at least 20% of income. Try the 50/30/20 rule.`,
          severity: 'warning',
        });
      } else if (savingsRate >= 20) {
        newInsights.push({
          user_id: user.id,
          insight_type: 'savings',
          title: 'Great Savings Rate',
          message: `Your savings rate is ${savingsRate}%. You're exceeding the recommended 20% threshold. Keep it up!`,
          severity: 'info',
        });
      }
    }

    const eWalletExpense = monthTx.filter((t) => t.source === 'e-wallet' && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const eWalletPct = totalExpense > 0 ? Math.round((eWalletExpense / totalExpense) * 100) : 0;
    if (eWalletPct > 60) {
      newInsights.push({
        user_id: user.id,
        insight_type: 'digital_spending',
        title: 'High E-Wallet Usage',
        message: `${eWalletPct}% of your spending goes through e-wallets. Digital payments can feel "invisible" - consider setting spending alerts.`,
        severity: 'info',
      });
    }

    const anomalyCount = monthTx.filter((t) => t.is_anomaly).length;
    if (anomalyCount > 0) {
      newInsights.push({
        user_id: user.id,
        insight_type: 'anomaly_summary',
        title: 'Anomalous Transactions Detected',
        message: `${anomalyCount} unusual transaction(s) detected this month. Review them in the Anomaly Detection tab.`,
        severity: 'warning',
      });
    }

    if (newInsights.length > 0) {
      try {
        await insightsApi.create(newInsights);
      } catch (err) {
        console.error('Failed to save insights:', err);
      }
    }

    setGenerating(false);
    fetchData();
  };

  const markAsRead = async (id: string) => {
    try {
      await insightsApi.markRead(id);
      setInsights((prev) => prev.map((i) => i.id === id ? { ...i, is_read: true } : i));
    } catch (err) {
      console.error('Failed to mark insight as read:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Insights</h1>
          <p className="text-slate-400 text-sm mt-1">Data-driven recommendations based on your spending patterns</p>
        </div>
        <button
          onClick={generateInsights}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 font-semibold rounded-xl hover:opacity-90 transition-all text-sm disabled:opacity-50"
        >
          {generating ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</>
          ) : (
            <><Zap className="w-4 h-4" /> Generate Insights</>
          )}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Monthly Expense</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Monthly Income</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Savings Rate</span>
          </div>
          <p className="text-2xl font-bold text-cyan-400">
            {totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            Spending Profile
          </h3>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar name="Spending" dataKey="amount" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">No categorized spending yet</div>
          )}
        </div>

        {/* Weekly Trend */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Weekly Trend
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 13 }}
              />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444' }} />
              <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          Smart Recommendations
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <RecommendationCard
            icon={<PiggyBank className="w-5 h-5" />}
            title="50/30/20 Rule"
            description="Allocate 50% for needs, 30% for wants, and 20% for savings. This is the gold standard for Gen Z budgeting."
            color="emerald"
          />
          <RecommendationCard
            icon={<Zap className="w-5 h-5" />}
            title="Set Spending Alerts"
            description="Enable notifications for transactions above your average spending to catch impulse purchases early."
            color="amber"
          />
          <RecommendationCard
            icon={<Target className="w-5 h-5" />}
            title="Category Budgets"
            description="Set per-category limits to prevent overspending in any single area like food delivery or shopping."
            color="cyan"
          />
          <RecommendationCard
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Review Anomalies"
            description="Regularly check the Anomaly Detection tab for unusual transactions that could indicate fraud."
            color="red"
          />
        </div>
      </div>

      {/* Generated Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Generated Insights</h3>
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`bg-slate-900 rounded-2xl border p-5 transition-all hover:translate-x-1 ${
                insight.severity === 'critical' ? 'border-red-500/30' :
                insight.severity === 'warning' ? 'border-amber-500/30' : 'border-slate-800'
              } ${insight.is_read ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  insight.severity === 'critical' ? 'bg-red-500/10 text-red-400' :
                  insight.severity === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-cyan-400'
                }`}>
                  {insight.severity === 'critical' ? <AlertTriangle className="w-5 h-5" /> :
                   insight.severity === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      insight.severity === 'critical' ? 'bg-red-500/10 text-red-400' :
                      insight.severity === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-cyan-400'
                    }`}>
                      {insight.insight_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500">{format(new Date(insight.created_at), 'MMM d')}</span>
                  </div>
                  <p className="text-sm font-medium text-white">{insight.title}</p>
                  <p className="text-sm text-slate-400 mt-1">{insight.message}</p>
                </div>
                {!insight.is_read && (
                  <button
                    onClick={() => markAsRead(insight.id)}
                    className="text-xs text-slate-400 hover:text-white transition-colors flex-shrink-0"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ icon, title, description, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'emerald' | 'amber' | 'cyan' | 'red';
}) {
  const colorMap = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorMap[color]} transition-all hover:scale-[1.02]`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}
