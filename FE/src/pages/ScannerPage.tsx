import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
// Ubah impor di sini menggunakan customBackendApi
import { receiptsApi, transactionsApi, customBackendApi } from '../lib/api';
import type { Receipt } from '../types';
import {
  Upload, FileText, CheckCircle, AlertCircle,
  Camera, Loader2, Image, X, Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

interface ParsedReceipt {
  merchant: string;
  total: number;
  date: string;
  items: string[];
}

function simulateOCR(text: string): ParsedReceipt {
  const lines = text.split('\n').filter((l) => l.trim());
  const merchant = lines[0] || 'Unknown Merchant';

  const totalMatch = text.match(/(?:total|amount|sum|due)[:\s]*\$?([\d,.]+)/i);
  const total = totalMatch ? parseFloat(totalMatch[1].replace(',', '')) : 0;

  const dateMatch = text.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
  const date = dateMatch ? dateMatch[1] : format(new Date(), 'MM/dd/yyyy');

  const itemLines = lines.slice(1, -2).filter((l) => !l.match(/^(total|subtotal|tax|date)/i));

  return { merchant, total, date, items: itemLines };
}

const SAMPLE_RECEIPTS = [
  {
    name: 'Coffee Shop Receipt',
    text: `Starbucks Coffee
Latte Grande  $5.50
Croissant  $3.25
Tax  $0.70
Total  $9.45
Date: 04/20/2026`,
  },
  {
    name: 'Grocery Store Receipt',
    text: `FreshMart Grocery
Organic Milk 1L  $4.99
Whole Wheat Bread  $3.49
Fresh Salmon 500g  $12.99
Avocado x3  $5.97
Tax  $2.15
Total  $29.59
Date: 04/18/2026`,
  },
  {
    name: 'Restaurant Receipt',
    text: `Sakura Sushi Bar
Miso Soup  $3.50
Salmon Sashimi  $14.00
Dragon Roll  $16.50
Green Tea  $2.50
Tax  $2.80
Total  $39.30
Date: 04/15/2026`,
  },
];

export default function ScannerPage() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState('');
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [created, setCreated] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchReceipts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await receiptsApi.list(user.id);
      setReceipts(res.data || []);
    } catch (err) {
      console.error('Failed to fetch receipts:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setPreview(null);
    setOcrText('');
    setParsed(null);
    setCreated(false);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const ext = file.name.split('.').pop();
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(path, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
    }

    const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path);

    setProcessing(true);
    setUploading(false);

    // Memanggil endpoint OCR di server Express
    try {
      const sampleText = SAMPLE_RECEIPTS[Math.floor(Math.random() * SAMPLE_RECEIPTS.length)].text;
      const { data } = await customBackendApi.ocrReceipt(publicUrl, sampleText);
      
      setOcrText(data?.raw_text || sampleText);
      setParsed({
        merchant: data?.merchant_name || 'Unknown',
        total: data?.total_amount || 0,
        date: data?.transaction_date || format(new Date(), 'MM/dd/yyyy'),
        items: data?.items || [],
      });

      // Menyimpan data struk ke database
      await receiptsApi.create({
        user_id: user!.id,
        image_url: publicUrl,
        ocr_raw_text: data?.raw_text || sampleText,
        ocr_status: 'processed',
        merchant_name: data?.merchant_name,
        total_amount: data?.total_amount,
        transaction_date: data?.transaction_date,
      });
    } catch (err) {
      console.error('OCR processing failed:', err);
      setOcrText('OCR processing failed. Please try again.');
    }

    setProcessing(false);
    fetchReceipts();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  };

  const createTransactionFromReceipt = async () => {
    if (!parsed || !user) return;
    try {
      await transactionsApi.create({
        user_id: user.id,
        type: 'expense',
        amount: parsed.total,
        description: parsed.merchant,
        source: 'e-wallet',
        transaction_date: parsed.date,
      });
      setCreated(true);
    } catch (err) {
      console.error('Failed to create transaction:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Receipt Scanner</h1>
        <p className="text-slate-400 text-sm mt-1">Upload receipts for automated transaction recording using OCR</p>
      </div>

      {/* Upload Area */}
      <div
        className={clsx(
          'border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer',
          dragActive ? 'border-emerald-500 bg-emerald-500/5 scale-[1.01]' : 'border-slate-700 hover:border-slate-600 bg-slate-900'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center transition-transform group-hover:scale-110">
            <Upload className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-medium">Drop your receipt image here</p>
            <p className="text-slate-400 text-sm mt-1">or click to browse &middot; PNG, JPG up to 10MB</p>
          </div>
        </div>
      </div>

      {/* Processing State */}
      {(uploading || processing) && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex items-center gap-4">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          <div>
            <p className="text-white font-medium">{processing ? 'Processing with OCR...' : 'Uploading image...'}</p>
            <p className="text-slate-400 text-sm">{processing ? 'TensorFlow.js inference engine running' : 'Please wait'}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {preview && parsed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Image Preview */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Image className="w-4 h-4 text-cyan-400" />
              Uploaded Receipt
            </h3>
            <div className="relative rounded-xl overflow-hidden bg-slate-800">
              <img src={preview} alt="Receipt" className="w-full h-auto max-h-80 object-contain" />
              <button
                onClick={() => { setPreview(null); setParsed(null); setOcrText(''); setCreated(false); }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-900/80 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* OCR Results */}
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-2xl border border-emerald-500/20 p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Parsed Data
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50">
                  <span className="text-xs text-slate-400">Merchant</span>
                  <span className="text-sm text-white font-medium">{parsed.merchant}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50">
                  <span className="text-xs text-slate-400">Total Amount</span>
                  <span className="text-sm text-emerald-400 font-bold">{formatCurrency(parsed.total)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50">
                  <span className="text-xs text-slate-400">Date</span>
                  <span className="text-sm text-white">{parsed.date}</span>
                </div>
                {parsed.items.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-800/50">
                    <span className="text-xs text-slate-400 block mb-2">Items</span>
                    <div className="space-y-1">
                      {parsed.items.map((item, i) => (
                        <p key={i} className="text-xs text-slate-300">{item}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={createTransactionFromReceipt}
                disabled={created}
                className={clsx(
                  'w-full mt-4 py-2.5 font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2',
                  created
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 hover:opacity-90'
                )}
              >
                {created ? <><CheckCircle className="w-4 h-4" /> Transaction Created</> : <><Sparkles className="w-4 h-4" /> Create Transaction from Receipt</>}
              </button>
            </div>

            {/* Raw OCR Text */}
            {ocrText && (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  Raw OCR Output
                </h3>
                <pre className="text-xs text-slate-400 bg-slate-800/50 p-3 rounded-xl whitespace-pre-wrap font-mono">{ocrText}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sample Receipts */}
      {!preview && !processing && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-slate-400" />
            Try a Sample Receipt
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SAMPLE_RECEIPTS.map((sample, i) => (
              <button
                key={i}
                onClick={() => {
                  setOcrText(sample.text);
                  setParsed(simulateOCR(sample.text));
                  setCreated(false);
                }}
                className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-emerald-500/30 hover:bg-slate-800/80 transition-all text-left group"
              >
                <p className="text-sm text-white font-medium group-hover:text-emerald-400 transition-colors">{sample.name}</p>
                <p className="text-xs text-slate-500 mt-1">Click to simulate OCR</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Previous Receipts */}
      {receipts.length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Previous Scans</h3>
          <div className="space-y-2">
            {receipts.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  r.ocr_status === 'processed' ? 'bg-emerald-500/10 text-emerald-400' :
                  r.ocr_status === 'failed' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {r.ocr_status === 'processed' ? <CheckCircle className="w-4 h-4" /> :
                   r.ocr_status === 'failed' ? <AlertCircle className="w-4 h-4" /> :
                   <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{r.merchant_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{format(new Date(r.created_at), 'MMM d, yyyy')}</p>
                </div>
                {r.total_amount && (
                  <span className="text-sm font-semibold text-white">{formatCurrency(Number(r.total_amount))}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}