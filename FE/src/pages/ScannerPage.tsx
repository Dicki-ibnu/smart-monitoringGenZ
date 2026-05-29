import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext'; 
import { receiptsApi, transactionsApi, customBackendApi } from '../lib/api';
import type { Receipt } from '../types';
import { Upload, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

interface ParsedReceipt { merchant: string; total: number; date: string; items: string[]; }

export default function ScannerPage() {
  const { user } = useAuth();
  const { activeStyle, isLight } = useTheme() as any; 
  
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [created, setCreated] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // STATE BARU: Pop-Up Modal
  const [modalState, setModalState] = useState<{type: 'success' | 'warning' | 'error', title: string, message: string} | null>(null);

  const fetchReceipts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await receiptsApi.list(user.id);
      setReceipts(res.data || []);
    } catch (err) {}
  }, [user]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const handleFile = async (file: File) => {
    setUploading(true); setPreview(null); setOcrText(''); setParsed(null); setCreated(false);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    
    // Simulasi OCR Sementara
    setProcessing(true); setUploading(false);
    setTimeout(() => {
      setOcrText("Mocked text");
      setParsed({ merchant: 'Toko Kopi Simulasi', total: 45000, date: format(new Date(), 'yyyy-MM-dd'), items: [] });
      setProcessing(false);
    }, 2000);
  };

  const createTransactionFromReceipt = async () => {
    if (!parsed || !user) return;
    try {
      await transactionsApi.create({ user_id: user.id, type: 'expense', amount: parsed.total, description: parsed.merchant, source: 'e-wallet', date: parsed.date, is_ocr: true });
      setCreated(true);
      setModalState({ type: 'success', title: 'Berhasil Masuk Pembukuan!', message: `Pengeluaran di ${parsed.merchant} sebesar Rp${parsed.total.toLocaleString('id-ID')} telah dicatat.` });
    } catch (err) {
      setModalState({ type: 'error', title: 'Gagal', message: 'Tidak dapat menyimpan transaksi hasil struk.' });
    }
  };

  if (!activeStyle) return null;

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className={clsx("text-2xl font-bold transition-colors", isLight ? "text-slate-800" : "text-white")}>Receipt Scanner</h1>
        <p className={clsx("text-sm mt-1 transition-colors", isLight ? "text-slate-500" : "text-slate-400")}>Upload receipts for automated transaction recording using OCR</p>
      </div>

      <div
        className={clsx(
          'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
          dragActive ? `${activeStyle.activeBorder} ${activeStyle.bg} scale-[1.01]` : isLight ? 'border-pink-200 hover:border-pink-400 bg-white' : 'border-slate-700 hover:border-slate-500 bg-slate-900'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files[0]; if(f) handleFile(f); }}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleFile(f); }} />
        <div className="flex flex-col items-center gap-3">
          <div className={clsx("w-16 h-16 rounded-2xl flex items-center justify-center transition-transform hover:scale-110", activeStyle.bg)}>
            <Upload className={clsx("w-8 h-8", activeStyle.text)} />
          </div>
          <div>
            <p className={clsx("font-medium", isLight ? "text-slate-700" : "text-white")}>Drop your receipt image here</p>
            <p className={clsx("text-sm mt-1", isLight ? "text-slate-500" : "text-slate-400")}>or click to browse &middot; PNG, JPG up to 10MB</p>
          </div>
        </div>
      </div>

      {preview && parsed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={clsx("rounded-2xl border p-6", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
             <h3 className={clsx("text-sm font-semibold mb-4", isLight ? "text-slate-800" : "text-white")}>Parsed Data</h3>
             
             {/* Info Merchant Singkat */}
             <div className="mb-4 space-y-2">
               <p className={isLight ? "text-slate-600" : "text-slate-300"}>Merchant: <span className="font-bold">{parsed.merchant}</span></p>
               <p className={isLight ? "text-slate-600" : "text-slate-300"}>Total: <span className="font-bold">Rp {parsed.total.toLocaleString('id-ID')}</span></p>
             </div>

             <button onClick={createTransactionFromReceipt} disabled={created} className={clsx("w-full mt-4 py-2.5 font-semibold rounded-xl text-sm flex items-center justify-center gap-2", created ? "bg-slate-200 text-emerald-500" : `${activeStyle.solidBg} ${activeStyle.solidText}`)}>
                {created ? <><CheckCircle className="w-4 h-4"/> Transaction Created</> : <><Sparkles className="w-4 h-4"/> Create Transaction</>}
             </button>
          </div>
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