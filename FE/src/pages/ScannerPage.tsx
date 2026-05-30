import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext'; 
import { receiptsApi, transactionsApi } from '../lib/api';
import type { Receipt } from '../types';
import { Upload, CheckCircle, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';
import axios from 'axios'; 

interface ParsedReceipt { 
  merchant: string; 
  total: number; 
  date: string; 
  items: string[]; 
  payment_method: string; 
  image_url?: string; 
}

export default function ScannerPage() {
  const { user } = useAuth();
  const { activeStyle, isLight } = useTheme() as any; 
  
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [created, setCreated] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [modalState, setModalState] = useState<{type: 'success' | 'warning' | 'error', title: string, message: string} | null>(null);

  const fetchReceipts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await receiptsApi.list(user.id);
      setReceipts(res.data || []);
    } catch (err) {}
  }, [user]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  // ==========================================
  // FUNGSI INTI: MENGIRIM GAMBAR KE AI BACK-END
  // ==========================================
  const handleFile = async (file: File) => {
    setUploading(true); 
    setPreview(null); 
    setParsed(null); 
    setCreated(false);
    
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    
    setProcessing(true); 
    setUploading(false);

    try {
      const formData = new FormData();
      formData.append('receiptImage', file); 

      const response = await axios.post('http://localhost:5000/api/ocr-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const aiData = response.data;

      // 2. SUDAH DIUBAH JADI image_url
      setParsed({ 
        merchant: aiData.merchant_name || 'Tidak Diketahui', 
        total: aiData.total_amount || 0, 
        date: format(new Date(), 'yyyy-MM-dd'), 
        items: [],
        payment_method: aiData.payment_method || 'cash',
        image_url: aiData.receipt_url 
      });

    } catch (error: any) {
      console.error("Gagal scan:", error);
      setModalState({ 
        type: 'error', 
        title: 'AI Gagal Membaca', 
        message: 'Terjadi kesalahan pada server AI. Pastikan server nyala dan gambar struk jelas.' 
      });
      setPreview(null); 
    } finally {
      setProcessing(false);
    }
  };

  const createTransactionFromReceipt = async () => {
    if (!parsed || !user) return;
    try {
      // 3. SUDAH DIUBAH JADI image_url
      await transactionsApi.create({ 
        user_id: user.id, 
        type: 'expense', 
        amount: parsed.total, 
        description: parsed.merchant, 
        source: parsed.payment_method, 
        date: parsed.date, 
        is_ocr: true,
        image_url: parsed.image_url 
      });
      
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

      {/* AREA UPLOAD */}
      <div
        className={clsx(
          'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
          dragActive ? `${activeStyle.activeBorder} ${activeStyle.bg} scale-[1.01]` : isLight ? 'border-pink-200 hover:border-pink-400 bg-white' : 'border-slate-700 hover:border-slate-500 bg-slate-900',
          processing ? 'opacity-50 pointer-events-none' : '' 
        )}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files[0]; if(f) handleFile(f); }}
        onClick={() => !processing && fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleFile(f); }} />
        <div className="flex flex-col items-center gap-3">
          <div className={clsx("w-16 h-16 rounded-2xl flex items-center justify-center transition-transform", activeStyle.bg, !processing && "hover:scale-110")}>
            {processing ? (
              <Loader2 className={clsx("w-8 h-8 animate-spin", activeStyle.text)} />
            ) : (
              <Upload className={clsx("w-8 h-8", activeStyle.text)} />
            )}
          </div>
          <div>
            <p className={clsx("font-medium", isLight ? "text-slate-700" : "text-white")}>
              {processing ? 'AI sedang mengekstrak data...' : 'Drop your receipt image here'}
            </p>
            <p className={clsx("text-sm mt-1", isLight ? "text-slate-500" : "text-slate-400")}>
              {processing ? 'Mohon tunggu 3-5 detik' : 'or click to browse · PNG, JPG up to 10MB'}
            </p>
          </div>
        </div>
      </div>

      {/* AREA HASIL PREVIEW & PARSED DATA */}
      {preview && parsed && !processing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in zoom-in duration-300">
          
          {/* Kolom Kiri: Tampilkan Gambar Struk */}
          <div className={clsx("rounded-2xl border p-2 flex justify-center", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
             <img src={preview} alt="Struk Upload" className="max-h-64 object-contain rounded-xl" />
          </div>

          {/* Kolom Kanan: Hasil AI */}
          <div className={clsx("rounded-2xl border p-6 flex flex-col justify-center", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
             <h3 className={clsx("text-sm font-semibold mb-4", isLight ? "text-slate-800" : "text-white")}>Parsed Data by AI</h3>
             
             <div className="mb-4 space-y-3">
               <div className="flex justify-between border-b border-slate-500/20 pb-2">
                 <span className={isLight ? "text-slate-500" : "text-slate-400"}>Merchant:</span>
                 <span className={clsx("font-bold text-right", isLight ? "text-slate-800" : "text-white")}>{parsed.merchant}</span>
               </div>
               <div className="flex justify-between border-b border-slate-500/20 pb-2">
                 <span className={isLight ? "text-slate-500" : "text-slate-400"}>Total Tagihan:</span>
                 <span className={clsx("font-bold text-right", isLight ? "text-slate-800" : "text-white")}>Rp {parsed.total.toLocaleString('id-ID')}</span>
               </div>
               <div className="flex justify-between pb-2">
                 <span className={isLight ? "text-slate-500" : "text-slate-400"}>Metode Bayar:</span>
                 <span className={clsx("font-bold text-right uppercase", isLight ? "text-slate-800" : "text-white")}>{parsed.payment_method}</span>
               </div>
             </div>

             <button onClick={createTransactionFromReceipt} disabled={created} className={clsx("w-full mt-auto py-3 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all", created ? "bg-emerald-500/20 text-emerald-500" : `${activeStyle.solidBg} ${activeStyle.solidText} hover:opacity-90`)}>
                {created ? <><CheckCircle className="w-5 h-5"/> Transaction Saved</> : <><Sparkles className="w-5 h-5"/> Save Transaction</>}
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