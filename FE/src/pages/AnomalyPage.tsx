import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
// Ubah impor di sini menggunakan customBackendApi
import { anomalyAlertsApi, anomalyUpdateApi, transactionsApi, customBackendApi } from '../lib/api';
import type { AnomalyAlert, Transaction } from '../types';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Brain, Activity,
  CheckCircle, Eye, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function AnomalyPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [alertRes, txRes] = await Promise.all([
        anomalyAlertsApi.list(user.id),
        transactionsApi.list(user.id),
      ]);
      setAlerts(alertRes.data || []);
      setTransactions(txRes.data || []);
    } catch (err) {
      console.error('Failed to fetch anomaly data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResolve = async (id: string) => {
    try {
      await anomalyAlertsApi.resolve(id);
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_resolved: true } : a));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  const runAnomalyScan = async () => {
    if (!user) return;
    setScanning(true);
    setScanResult(null);

    const userTx = transactions.filter((t) => t.type === 'expense');
    if (userTx.length < 3) {
      setScanResult('Not enough transaction data to run anomaly detection. Add at least 3 expense transactions.');
      setScanning(false);
      return;
    }

    try {
      // Panggil endpoint deteksi anomali di server Express
      const { data } = await customBackendApi.anomalyDetect(userTx);
      const anomalies = data?.anomalies || [];

      if (anomalies.length > 0) {
        // Flag transaksi anomali via REST API
        for (const anomaly of anomalies) {
          await anomalyUpdateApi.flagAnomaly(anomaly.transaction_id, anomaly.z_score);

          // Buat peringatan
          await anomalyAlertsApi.create({
            user_id: user.id,
            transaction_id: anomaly.transaction_id,
            alert_type: anomaly.alert_type,
            severity: anomaly.severity,
            message: anomaly.message,
          });
        }
        setScanResult(`Detected ${anomalies.length} anomalous transaction(s). Alerts created. Model: ${data.model}`);
      } else {
        setScanResult(data?.stats ? `No anomalies detected. Your spending looks normal. (Analyzed ${data.stats.total} transactions)` : 'No anomalies detected.');
      }
    } catch (err) {
      console.error('Anomaly scan failed:', err);
      setScanResult('Scan failed. Please try again.');
    }

    setScanning(false);
    fetchData();
  };

  const filtered = alerts.filter((a) => filter === 'all' || a.severity === filter);
  const unresolvedCount = alerts.filter((a) => !a.is_resolved).length;
  const highCount = alerts.filter((a) => a.severity === 'high' && !a.is_resolved).length;

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
          <h1 className="text-2xl font-bold text-white">Anomaly Detection</h1>
          <p className="text-slate-400 text-sm mt-1">AI-powered early warning system for unusual transactions</p>
        </div>
        <button
          onClick={runAnomalyScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-semibold rounded-xl hover:opacity-90 transition-all text-sm disabled:opacity-50"
        >
          {scanning ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>
          ) : (
            <><Brain className="w-4 h-4" /> Run AI Scan</>
          )}
        </button>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 flex items-start gap-3">
          <Activity className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          {scanResult}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Unresolved</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{unresolvedCount}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">High Severity</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{highCount}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{alerts.filter((a) => a.is_resolved).length}</p>
        </div>
      </div>

      {/* ML Model Status */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          ML Inference Engine Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-xs text-slate-400">Anomaly Model</p>
              <p className="text-sm text-white font-medium">Z-Score Detection</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <p className="text-xs text-slate-400">OCR Model</p>
              <p className="text-sm text-white font-medium">TensorFlow.js Ready</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <div>
              <p className="text-xs text-slate-400">Training Data</p>
              <p className="text-sm text-white font-medium">{transactions.length} transactions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterChip>
        <FilterChip active={filter === 'high'} onClick={() => setFilter('high')} color="red">High</FilterChip>
        <FilterChip active={filter === 'medium'} onClick={() => setFilter('medium')} color="amber">Medium</FilterChip>
        <FilterChip active={filter === 'low'} onClick={() => setFilter('low')} color="slate">Low</FilterChip>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filtered.map((alert) => (
          <div
            key={alert.id}
            className={clsx(
              'bg-slate-900 rounded-2xl border p-5 transition-all hover:translate-x-1',
              alert.is_resolved ? 'border-slate-800 opacity-60' : (
                alert.severity === 'high' ? 'border-red-500/30' :
                alert.severity === 'medium' ? 'border-amber-500/30' : 'border-slate-800'
              )
            )}
          >
            <div className="flex items-start gap-4">
              <div className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                alert.severity === 'high' ? 'bg-red-500/10 text-red-400' :
                alert.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
              )}>
                {alert.is_resolved ? <CheckCircle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={clsx(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    alert.severity === 'high' ? 'bg-red-500/10 text-red-400' :
                    alert.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-400'
                  )}>
                    {alert.severity}
                  </span>
                  <span className="text-xs text-slate-500">{alert.alert_type.replace('_', ' ')}</span>
                  {alert.is_resolved && <span className="text-xs text-emerald-400">Resolved</span>}
                </div>
                <p className="text-sm text-white">{alert.message}</p>
                <p className="text-xs text-slate-500 mt-1">{format(new Date(alert.created_at), 'MMM d, yyyy HH:mm')}</p>
                {alert.transaction && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <Eye className="w-3.5 h-3.5" />
                    {alert.transaction.description} &middot; {formatCurrency(Number(alert.transaction.amount))}
                  </div>
                )}
              </div>
              {!alert.is_resolved && (
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-700" />
            No anomaly alerts found
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, color, children }: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    red: active ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'text-slate-400 border-slate-700',
    amber: active ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'text-slate-400 border-slate-700',
    slate: active ? 'bg-slate-700 text-slate-300 border-slate-600' : 'text-slate-400 border-slate-700',
  };

  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
        !color && (active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'text-slate-400 border-slate-700'),
        color && colorMap[color]
      )}
    >
      {children}
    </button>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}