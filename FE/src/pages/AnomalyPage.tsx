import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext'; 
import { anomalyAlertsApi, transactionsApi, customBackendApi } from '../lib/api';
import type { AnomalyAlert, Transaction } from '../types';
import { ShieldAlert, AlertTriangle, Brain, Loader2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function AnomalyPage() {
  const { user } = useAuth();
  const { activeStyle, isLight } = useTheme() as any; 
  
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [scanning, setScanning] = useState(false);
  
  // STATE UNTUK POP-UP MODAL YANG CANTIK
  const [scanResult, setScanResult] = useState<{type: 'success' | 'warning' | 'error', title: string, message: string} | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [alertRes, txRes] = await Promise.all([ 
        anomalyAlertsApi.list(user.id), 
        transactionsApi.list(user.id) 
      ]);
      setAlerts(alertRes.data || []);
      setTransactions(txRes.data || []);
    } catch (err) {
      console.error("Gagal mengambil data:", err);
    } finally { 
      setLoading(false); 
    }
  }, [user]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const runAnomalyScan = async () => {
    if (!user) return;
    if (transactions.length === 0) {
      setScanResult({ type: 'warning', title: 'Oops!', message: 'Belum ada transaksi untuk di-scan.'});
      return;
    }
    
    setScanning(true);
    setScanResult(null); // Tutup modal sebelumnya jika ada

    try {
      // Mengirim variabel 'transactions' sebagai array mentah. 
      const res = await customBackendApi.anomalyDetect(transactions);
      const newAnomalies = res.data.anomalies;

      if (newAnomalies && newAnomalies.length > 0) {
        
        // BATCH INSERT (Menyimpan semua anomali secara serentak/parallel)
        const insertPromises = newAnomalies.map((anomaly: any) => {
          const alertData = {
            user_id: user.id,
            transaction_id: anomaly.transaction_id,
            alert_type: anomaly.alert_type,
            severity: anomaly.severity,
            z_score: Number(anomaly.z_score),
            message: anomaly.message,
            is_resolved: false
          };
          return anomalyAlertsApi.create(alertData);
        });

        // Eksekusi semua proses simpan dalam 1 waktu
        await Promise.all(insertPromises);
        
        fetchData(); // Refresh list di layar
        
        // POP-UP BAHAYA TAPI CANTIK
        setScanResult({ 
          type: 'warning', 
          title: 'Waspada!', 
          message: `AI mendeteksi ${newAnomalies.length} transaksi yang sangat tidak wajar! Cek daftarnya di bawah.`
        });
      } else {
        // POP-UP AMAN TAPI CANTIK
        setScanResult({ 
          type: 'success', 
          title: 'Semua Aman!', 
          message: 'Keuanganmu stabil! AI tidak menemukan pengeluaran aneh (outlier) bulan ini.'
        });
      }
    } catch (err: any) {
      console.error("Gagal menjalankan AI Scan:", err);
      // POP-UP ERROR
      setScanResult({ 
        type: 'error', 
        title: 'Koneksi Gagal', 
        message: `Error gagal menghubungi AI Backend: ${err.message || 'Cek console browser'}`
      });
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (id: string) => { 
    try {
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_resolved: true } : a)); 
    } catch (err) {
      console.error("Gagal menutup alert");
    }
  };

  const filtered = alerts.filter((a) => filter === 'all' || a.severity === filter);
  const unresolvedCount = alerts.filter((a) => !a.is_resolved).length;
  const highCount = alerts.filter((a) => a.severity === 'high' && !a.is_resolved).length;

  if (loading || !activeStyle) return <div className="flex justify-center h-64 items-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500"/></div>;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={clsx("text-2xl font-bold transition-colors", isLight ? "text-slate-800" : "text-white")}>Anomaly Detection</h1>
          <p className={clsx("text-sm mt-1 transition-colors", isLight ? "text-slate-500" : "text-slate-400")}>AI-powered early warning system for unusual transactions</p>
        </div>
        <button 
          onClick={runAnomalyScan} 
          disabled={scanning} 
          className={clsx("flex items-center gap-2 px-4 py-2.5 font-semibold rounded-xl hover:opacity-90 transition-all text-sm disabled:opacity-50", activeStyle.solidBg, activeStyle.solidText)}
        >
          {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Brain className="w-4 h-4" /> Run AI Scan</>}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={clsx("rounded-2xl border p-5 transition-transform hover:scale-[1.02]", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-500" /></div>
            <span className={clsx("text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-500" : "text-slate-400")}>Unresolved</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">{unresolvedCount}</p>
        </div>
        <div className={clsx("rounded-2xl border p-5 transition-transform hover:scale-[1.02]", isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/5`)}>
           <div className="flex items-center gap-3 mb-2">
             <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-red-500" /></div>
             <span className={clsx("text-xs font-medium uppercase tracking-wider", isLight ? "text-slate-500" : "text-slate-400")}>High Severity</span>
           </div>
           <p className="text-2xl font-bold text-red-500">{highCount}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={clsx("rounded-2xl border p-8 text-center transition-all", isLight ? "bg-white border-pink-100" : `${activeStyle.sidebarBg} border-white/5`)}>
          <Brain className="w-12 h-12 mx-auto text-emerald-500/50 mb-3" />
          <h3 className={clsx("text-lg font-semibold", isLight ? "text-slate-800" : "text-white")}>Semua Aman!</h3>
          <p className={clsx("text-sm mt-1", isLight ? "text-slate-500" : "text-slate-400")}>Belum ada anomali yang terdeteksi bulan ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <div key={alert.id} className={clsx('rounded-2xl border p-5 transition-all', alert.is_resolved ? 'opacity-50 scale-[0.99]' : 'hover:translate-x-1', isLight ? "bg-white border-pink-100 shadow-sm" : `${activeStyle.sidebarBg} border-white/10`)}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.severity === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${alert.severity === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      {alert.severity === 'high' ? 'HIGH RISK' : 'WARNING'}
                    </span>
                    <span className="text-xs text-slate-500">{format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}</span>
                  </div>
                  <p className={clsx("text-sm font-semibold mt-1", isLight ? "text-slate-800" : "text-white")}>{alert.message}</p>
                </div>
                {!alert.is_resolved && (
                  <button onClick={() => handleResolve(alert.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all flex-shrink-0">
                    Tandai Aman
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================= */}
      {/* KODE POP-UP MODAL (MENGGANTIKAN ALERT)  */}
      {/* ========================================= */}
      {scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={clsx("rounded-3xl p-6 max-w-sm w-full shadow-2xl transform transition-all border text-center", isLight ? "bg-white border-pink-100" : "bg-slate-900 border-slate-800")}>
            
            {/* Ikon Dinamis berdasarkan Tipe Alert */}
            <div className="flex justify-center mb-4">
              {scanResult.type === 'success' && (
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 shadow-inner">
                  <CheckCircle className="w-8 h-8" />
                </div>
              )}
              {scanResult.type === 'warning' && (
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 shadow-inner">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              )}
              {scanResult.type === 'error' && (
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-500 shadow-inner">
                  <ShieldAlert className="w-8 h-8" />
                </div>
              )}
            </div>

            <h3 className={clsx("text-xl font-bold mb-2", isLight ? "text-slate-800" : "text-white")}>
              {scanResult.title}
            </h3>
            
            <p className={clsx("text-sm mb-6", isLight ? "text-slate-500" : "text-slate-400")}>
              {scanResult.message}
            </p>
            
            <button 
              onClick={() => setScanResult(null)} 
              className={clsx("w-full py-3 rounded-xl font-bold text-sm transition-transform active:scale-95", activeStyle.solidBg, activeStyle.solidText)}
            >
              Oke, Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}