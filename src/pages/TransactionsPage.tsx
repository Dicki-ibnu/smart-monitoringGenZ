import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Transaction, Category, TransactionSource, TransactionType } from '../types';
import { Plus, Search, Trash2, CreditCard as Edit3, X, Check, ArrowUpRight, ArrowDownRight, CreditCard, Smartphone, Banknote, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

const SOURCES: { value: TransactionSource; label: string; icon: React.ReactNode }[] = [
  { value: 'e-wallet', label: 'E-Wallet', icon: <Smartphone className="w-4 h-4" /> },
  { value: 'mobile-banking', label: 'Mobile Banking', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'cash', label: 'Cash', icon: <Banknote className="w-4 h-4" /> },
  { value: 'debit-card', label: 'Debit Card', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'credit-card', label: 'Credit Card', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'transfer', label: 'Transfer', icon: <ArrowUpRight className="w-4 h-4" /> },
];

const AUTO_CATEGORIES: Record<string, string[]> = {
  'Food & Drinks': ['gojek', 'grab', 'starbucks', 'mcdonald', 'food', 'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'sushi', 'noodle'],
  'Shopping': ['shopee', 'tokopedia', 'amazon', 'shop', 'store', 'market', 'mall'],
  'Transport': ['uber', 'lyft', 'grab', 'gojek', 'gas', 'fuel', 'parking', 'mrt', 'bus', 'train'],
  'Entertainment': ['netflix', 'spotify', 'game', 'movie', 'cinema', 'concert', 'youtube'],
  'Bills': ['pln', 'water', 'internet', 'phone', 'electricity', 'bill', 'subscription'],
  'Health': ['pharmacy', 'doctor', 'hospital', 'clinic', 'medicine', 'health'],
};

function autoCategorize(description: string, categories: Category[]): string | null {
  const lower = description.toLowerCase();
  for (const [catName, keywords] of Object.entries(AUTO_CATEGORIES)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      const cat = categories.find((c) => c.name === catName);
      if (cat) return cat.id;
    }
  }
  return null;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterSource, setFilterSource] = useState<'all' | TransactionSource>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false });
    setTransactions(data || []);
    setLoading(false);
  }, [user]);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('categories').select('*').eq('user_id', user.id);
    setCategories(data || []);
  }, [user]);

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, [fetchTransactions, fetchCategories]);

  const filtered = transactions.filter((tx) => {
    const matchSearch = !search || tx.description.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || tx.type === filterType;
    const matchSource = filterSource === 'all' || tx.source === filterSource;
    return matchSearch && matchType && matchSource;
  });

  const handleDelete = async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setShowForm(true);
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
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and categorize your digital transactions</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 font-semibold rounded-xl hover:opacity-90 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>
        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="appearance-none pl-3 pr-8 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as typeof filterSource)}
            className="appearance-none pl-3 pr-8 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Sources</option>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Transaction Form Modal */}
      {showForm && (
        <TransactionForm
          userId={user!.id}
          categories={categories}
          editingId={editingId}
          transactions={transactions}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSaved={() => { fetchTransactions(); setShowForm(false); setEditingId(null); }}
        />
      )}

      {/* Transaction List */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Description</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Category</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Source</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Amount</th>
                <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Date</th>
                <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tx.type === 'expense' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {tx.type === 'expense' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm text-white">{tx.description || 'Untitled'}</p>
                        {tx.is_anomaly && (
                          <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Anomaly</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {tx.category && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: tx.category.color + '15', color: tx.category.color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: tx.category.color }} />
                        {tx.category.name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400 capitalize">{tx.source.replace('-', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-semibold ${tx.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                      {tx.type === 'expense' ? '-' : '+'}{formatCurrency(Number(tx.amount))}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400">{format(new Date(tx.transaction_date), 'MMM d, yyyy')}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(tx)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">No transactions found</div>
        )}
      </div>
    </div>
  );
}

function TransactionForm({ userId, categories, editingId, transactions, onClose, onSaved }: {
  userId: string;
  categories: Category[];
  editingId: string | null;
  transactions: Transaction[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editingTx = editingId ? transactions.find((t) => t.id === editingId) : null;
  const [type, setType] = useState<TransactionType>(editingTx?.type || 'expense');
  const [amount, setAmount] = useState(editingTx ? String(editingTx.amount) : '');
  const [description, setDescription] = useState(editingTx?.description || '');
  const [source, setSource] = useState<TransactionSource>(editingTx?.source || 'e-wallet');
  const [categoryId, setCategoryId] = useState(editingTx?.category_id || '');
  const [date, setDate] = useState(editingTx?.transaction_date || format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [autoCat, setAutoCat] = useState(false);

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    if (!editingTx && val.length > 2) {
      const catId = autoCategorize(val, categories);
      if (catId) {
        setCategoryId(catId);
        setAutoCat(true);
        setTimeout(() => setAutoCat(false), 2000);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      user_id: userId,
      type,
      amount: Number(amount),
      description,
      source,
      category_id: categoryId || null,
      transaction_date: date,
    };

    if (editingId) {
      await supabase.from('transactions').update(payload).eq('id', editingId);
    } else {
      await supabase.from('transactions').insert(payload);
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Transaction' : 'New Transaction'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex bg-slate-800/50 rounded-xl p-1">
            <button type="button" onClick={() => setType('expense')} className={clsx('flex-1 py-2 rounded-lg text-sm font-medium transition-all', type === 'expense' ? 'bg-red-500 text-white' : 'text-slate-400')}>Expense</button>
            <button type="button" onClick={() => setType('income')} className={clsx('flex-1 py-2 rounded-lg text-sm font-medium transition-all', type === 'income' ? 'bg-emerald-500 text-white' : 'text-slate-400')}>Income</button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Description
              {autoCat && <span className="ml-2 text-emerald-400 text-xs">Auto-categorized!</span>}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
              placeholder="e.g. Grab food delivery"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as TransactionSource)}
                className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">Uncategorized</option>
              {categories.filter((c) => c.type === type).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-all text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 font-semibold rounded-xl hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? 'Saving...' : <><Check className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}
