import axios from 'axios';
import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Konfigurasi utama untuk CRUD Database ke Supabase
const api = axios.create({
  baseURL: `${supabaseUrl}/rest/v1`,
  headers: {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// 👇 TAMBAHAN BARU: SENSOR ERROR PINTAR
// Fitur ini akan membongkar alasan kenapa Supabase menolak menyimpan data Insights-mu!
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Akan mencetak pesan merah tebal di Console browser-mu
    console.error('🚨 BONGKAR ERROR SUPABASE:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Transactions
export const transactionsApi = {
  list: (userId: string) =>
    api.get(`/transactions?user_id=eq.${userId}&select=*&order=date.desc&limit=100`),
  create: (data: unknown) => api.post('/transactions', data),
  update: (id: string, data: unknown) => api.patch(`/transactions?id=eq.${id}`, data),
  delete: (id: string) => api.delete(`/transactions?id=eq.${id}`),
};

// Categories (Dibiarkan untuk mencegah error di halaman Dashboard lama)
export const categoriesApi = {
  list: (userId: string) => api.get(`/categories?user_id=eq.${userId}`),
  create: (data: unknown) => api.post('/categories', data),
};

// Anomaly Alerts
export const anomalyAlertsApi = {
  list: (userId: string) =>
    api.get(`/anomaly_alerts?user_id=eq.${userId}&select=*,transaction:transactions(*)&order=created_at.desc`),
  create: (data: unknown) => api.post('/anomaly_alerts', data),
  resolve: (id: string) => api.patch(`/anomaly_alerts?id=eq.${id}`, { is_resolved: true }),
};

// Transactions - anomaly flag updates
export const anomalyUpdateApi = {
  flagAnomaly: (id: string, score: number) =>
    api.patch(`/transactions?id=eq.${id}`, { is_anomaly: true, anomaly_score: score }),
};

// Receipts
export const receiptsApi = {
  list: (userId: string) => api.get(`/receipts?user_id=eq.${userId}&order=created_at.desc`),
  create: (data: unknown) => api.post('/receipts', data),
};

// Insights
export const insightsApi = {
  list: (userId: string) => api.get(`/insights?user_id=eq.${userId}&order=created_at.desc`),
  create: (data: unknown) => api.post('/insights', data),
  markRead: (id: string) => api.patch(`/insights?id=eq.${id}`, { is_read: true }),
};

// Profiles
export const profilesApi = {
  get: (userId: string) =>
    api.get(`/profiles?id=eq.${userId}`).then((r) => r.data?.[0] ?? null),
  updateTheme: (userId: string, themeName: string) =>
    api.patch(`/profiles?id=eq.${userId}`, { active_theme: themeName }),
  updatePoints: (userId: string, newPoints: number) =>
    api.patch(`/profiles?id=eq.${userId}`, { points: newPoints }),
  unlockTheme: (userId: string, themeName: string, newPoints: number, currentUnlocked: string[]) =>
    api.patch(`/profiles?id=eq.${userId}`, {
      points: newPoints,
      unlocked_themes: [...currentUnlocked, themeName]
    }),
  getLeaderboard: () =>
    api.get(`/profiles?select=id,full_name,points&order=points.desc&limit=10`),
};

// URL Backend Express
const expressBaseUrl = 'http://localhost:5000/api';

// Panggilan khusus ke server Express untuk AI dan OCR
export const customBackendApi = {
  anomalyDetect: (transactions: unknown[]) => {
    return axios.post(`${expressBaseUrl}/anomaly-detect`, { transactions });
  },
  ocrReceipt: (imageUrl: string, rawText: string) => {
    return axios.post(`${expressBaseUrl}/ocr-receipt`, { image_url: imageUrl, raw_text: rawText });
  },
};

export default api;