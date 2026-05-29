import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { transactionsApi, profilesApi } from '../lib/api';
import { useTheme } from '../context/ThemeContext'; 
import type { Transaction, TransactionSource, TransactionType } from '../types';
import { Plus, Search, Trash2, CreditCard as Edit3, X, Check, ArrowUpRight, ArrowDownRight, CreditCard, Smartphone, Banknote, ChevronDown, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
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
  'Food & Beverage': ['gojek', 'grab', 'starbucks', 'mcdonald', 'food', 'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'sushi', 'noodle', 'kopi', 'makan'],
  'Shopping': ['shopee', 'tokopedia', 'amazon', 'shop', 'store', 'market', 'mall', 'baju', 'sepatu'],
  'Transport': ['uber', 'lyft', 'grab', 'gojek', 'gas', 'fuel', 'parking', 'mrt', 'bus', 'train', 'bensin', 'parkir'],
  'Entertainment': ['netflix', 'spotify', 'game', 'movie', 'cinema', 'concert', 'youtube', 'nonton', 'main'],
  'Bills': ['pln', 'water', 'internet', 'phone', 'electricity', 'bill', 'subscription', 'listrik', 'wifi', 'kuota'],
  'Health': ['pharmacy', 'doctor', 'hospital', 'clinic', 'medicine', 'health', 'obat', 'dokter'],
};

function autoCategorize(description: string): string | null {
  const lower = description.toLowerCase();
  for (const [catName, keywords] of Object.entries(AUTO_CATEGORIES)) {
    if (keywords.some((kw) => lower.includes(kw))) return catName;
  }
  return null;
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const { activeStyle, isLight } = useTheme() as any;
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [filterSource, setFilterSource] = useState<'all' | TransactionSource>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // STATE BARU: Pop-Up Modal
  const [modalState, setModalState] = useState<{type: 'success' | 'warning' | 'error', title: string, message: string} | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const res = await transactionsApi.list(user.id);
      setTransactions(res.data || []);
    } catch (err) {
      setModalState({ type: 'error', title: 'Gagal', message: 'Gagal mengambil data transaksi.' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const filtered = transactions.filter((tx) => {
    const matchSearch = !search || tx.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || (tx.type || 'expense') === filterType;
    const matchSource = filterSource === 'all' || (tx.source || 'e-wallet') === filterSource;
    return matchSearch && matchType && matchSource;
  });

  const handleDelete = async (id: string) => {
    try {
      await transactionsApi.delete(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setModalState({ type: 'success', title: 'Dihapus!', message: 'Transaksi berhasil dihapus dari riwayat.' });
    } catch (err) {
      setModalState({ type: 'error', title: 'Gagal', message: 'Gagal menghapus transaksi.' });
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setShowForm(true);
  };

  if (loading || !activeStyle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`w-8 h-8 border-2 ${activeStyle?.text || 'text-emerald-500'} border-t-transparent rounded-full animate-spin`} />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={clsx("text-2xl font-bold transition-colors", isLight ? "text-slate-800" : "text-white")}>Transactions</h1>
          <p className={clsx("text-sm mt-1 transition-colors", isLight ? "text-slate-500" : "text-slate-400")}>Manage and categorize your digital transactions</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className={clsx("flex items-center gap-2 px-4 py-2.5 font-semibold rounded-xl hover:opacity-90 transition-all text-sm", activeStyle.solidBg, activeStyle.solidText, activeStyle.glow)}
        >
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className={clsx("w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-colors", isLight ? "bg-white border-pink-100 text-slate-800 placeholder-slate-400" : `${activeStyle.sidebarBg} border-white/10 text-white placeholder-slate-500`)}
          />
        </div>
      </div>

      {showForm && (
        <TransactionForm
          userId={user!.id} editingId={editingId} transactions={transactions}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSuccess={(msg: string) => { 
            fetchTransactions(); 
            setShowForm(false); 
            setEditingId(null); 
            setModalState({ type: 'success', title: 'Berhasil!', message: msg });
          }}
          onError={(msg: string) => setModalState({ type: 'error', title: 'Oops!', message: msg })}
        />
      )}

      <div className={clsx("rounded-2xl border overflow-hidden transition-all", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
        <div className="block sm:hidden divide-y divide-slate-800/50">
          {filtered.map((tx) => (
            <div key={tx.id} className={clsx("p-4 transition-colors", isLight ? "hover:bg-pink-50" : "hover:bg-slate-800/30")}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(tx.type || 'expense') === 'expense' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {(tx.type || 'expense') === 'expense' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx("text-sm truncate font-medium", isLight ? "text-slate-800" : "text-white")}>{tx.description || 'Untitled'}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={clsx("text-xs capitalize", isLight ? "text-slate-500" : "text-slate-400")}>{(tx.source || 'e-wallet').replace('-', ' ')}</span>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${(tx.type || 'expense') === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                  {(tx.type || 'expense') === 'expense' ? '-' : '+'}{formatCurrency(Number(tx.amount))}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={clsx("border-b", isLight ? "border-pink-100" : "border-slate-800")}>
                <th className={clsx("text-left text-xs font-medium uppercase tracking-wider px-6 py-4", isLight ? "text-slate-500" : "text-slate-400")}>Description</th>
                <th className={clsx("text-left text-xs font-medium uppercase tracking-wider px-6 py-4", isLight ? "text-slate-500" : "text-slate-400")}>Category</th>
                <th className={clsx("text-left text-xs font-medium uppercase tracking-wider px-6 py-4", isLight ? "text-slate-500" : "text-slate-400")}>Source</th>
                <th className={clsx("text-right text-xs font-medium uppercase tracking-wider px-6 py-4", isLight ? "text-slate-500" : "text-slate-400")}>Amount</th>
                <th className={clsx("text-left text-xs font-medium uppercase tracking-wider px-6 py-4", isLight ? "text-slate-500" : "text-slate-400")}>Date</th>
                <th className={clsx("text-right text-xs font-medium uppercase tracking-wider px-6 py-4", isLight ? "text-slate-500" : "text-slate-400")}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/10">
              {filtered.map((tx) => (
                <tr key={tx.id} className={clsx("transition-colors", isLight ? "hover:bg-pink-50" : "hover:bg-slate-800/30")}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${(tx.type || 'expense') === 'expense' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {(tx.type || 'expense') === 'expense' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <p className={clsx("text-sm font-medium", isLight ? "text-slate-800" : "text-white")}>{tx.description || 'Untitled'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {tx.category && <span className={clsx("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", isLight ? "bg-slate-100 text-slate-600" : "bg-slate-800 text-slate-300")}>{tx.category}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx("text-xs capitalize", isLight ? "text-slate-600" : "text-slate-400")}>{(tx.source || 'e-wallet').replace('-', ' ')}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-bold ${(tx.type || 'expense') === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {(tx.type || 'expense') === 'expense' ? '-' : '+'}{formatCurrency(Number(tx.amount))}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx("text-xs", isLight ? "text-slate-600" : "text-slate-400")}>{tx.date ? format(new Date(tx.date), 'MMM d, yyyy') : '-'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(tx)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

// ... Kodingan TransactionForm ke bawah DIBIARKAN SAMA ...
function TransactionForm({ userId, editingId, transactions, onClose, onSuccess, onError }: any) {
  const { activeStyle, isLight } = useTheme() as any;
  const editingTx = editingId ? transactions.find((t: any) => t.id === editingId) : null;
  
  const [type, setType] = useState<TransactionType>(editingTx?.type || 'expense');
  const [amount, setAmount] = useState(editingTx ? String(editingTx.amount) : '');
  const [description, setDescription] = useState(editingTx?.description || '');
  const [source, setSource] = useState<TransactionSource>(editingTx?.source || 'e-wallet');
  const [category, setCategory] = useState(editingTx?.category || '');
  const [date, setDate] = useState(editingTx?.date || format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [autoCat, setAutoCat] = useState(false);

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    if (!editingTx && val.length > 2) {
      const detectedCategory = autoCategorize(val);
      if (detectedCategory) {
        setCategory(detectedCategory);
        setAutoCat(true);
        setTimeout(() => setAutoCat(false), 2000);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { user_id: userId, type, amount: Number(amount), description, source, category: category || 'Uncategorized', date, is_ocr: false };
    
    try {
      if (editingId) { 
        await transactionsApi.update(editingId, payload); 
        onSuccess('Transaksi berhasil diperbarui!'); 
      } else { 
        await transactionsApi.create(payload); 
        try {
          const profile = await profilesApi.get(userId);
          await profilesApi.updatePoints(userId, (profile?.points || 0) + 10);
        } catch (pointErr) {}
        onSuccess('Transaksi berhasil disimpan! Kamu dapat +10 Poin Gen-Z '); 
      }
    } catch (err) { 
      onError('Terjadi kesalahan saat menyimpan transaksi ke database.'); 
    }
    setSaving(false);
  };

  const inputClass = clsx(
    "w-full px-4 py-3 border rounded-xl text-sm focus:outline-none transition-all",
    isLight ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-pink-400" : "bg-slate-800/50 border-slate-700 text-white focus:border-emerald-500"
  );
  const labelClass = clsx("block text-sm font-medium mb-1.5", isLight ? "text-slate-600" : "text-slate-400");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={clsx("border rounded-2xl w-full max-w-lg p-6 shadow-2xl", isLight ? "bg-white border-pink-200" : `${activeStyle.sidebarBg} border-slate-800`)} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={clsx("text-lg font-bold", isLight ? "text-slate-800" : "text-white")}>{editingId ? 'Edit Transaction' : 'New Transaction'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={clsx("flex rounded-xl p-1", isLight ? "bg-slate-100" : "bg-slate-800/50")}>
            <button type="button" onClick={() => setType('expense')} className={clsx('flex-1 py-2 rounded-lg text-sm font-medium transition-all', type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-500')}>Expense</button>
            <button type="button" onClick={() => setType('income')} className={clsx('flex-1 py-2 rounded-lg text-sm font-medium transition-all', type === 'income' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-500')}>Income</button>
          </div>

          <div>
            <label className={labelClass}>Amount (Rp)</label>
            <input
              type="text" inputMode="numeric" value={amount} required
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              className={inputClass} placeholder="Contoh: 50000"
            />
          </div>

          <div>
            <label className={labelClass}>
              Description
              {autoCat && <span className="ml-2 text-emerald-500 text-xs animate-pulse">Auto-categorized!</span>}
            </label>
            <input
              type="text" value={description} required
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className={inputClass} placeholder="e.g. Beli Kopi Starbucks"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Source</label>
              <select value={source} onChange={(e) => setSource(e.target.value as TransactionSource)} className={inputClass}>
                {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date</label>
              <input type="date" value={date} required onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              <option value="">Uncategorized</option>
              {Object.keys(AUTO_CATEGORIES).map((catName) => (
                <option key={catName} value={catName}>{catName}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className={clsx("flex-1 py-3 font-medium rounded-xl text-sm transition-all", isLight ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-slate-800 text-slate-300 hover:bg-slate-700")}>Cancel</button>
            <button type="submit" disabled={saving} className={clsx("flex-1 py-3 font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2", activeStyle.solidBg, activeStyle.solidText)}>
              {saving ? 'Saving...' : <><Check className="w-4 h-4" /> Save</>}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}