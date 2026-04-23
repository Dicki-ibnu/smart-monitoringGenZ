import axios from 'axios';
import { supabase } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

// Transactions
export const transactionsApi = {
  list: (userId: string) =>
    api.get(`/transactions?user_id=eq.${userId}&select=*,category:categories(*)&order=transaction_date.desc&limit=100`),

  create: (data: unknown) =>
    api.post('/transactions', data),

  update: (id: string, data: unknown) =>
    api.patch(`/transactions?id=eq.${id}`, data),

  delete: (id: string) =>
    api.delete(`/transactions?id=eq.${id}`),
};

// Categories
export const categoriesApi = {
  list: (userId: string) =>
    api.get(`/categories?user_id=eq.${userId}`),

  create: (data: unknown) =>
    api.post('/categories', data),
};

// Anomaly Alerts
export const anomalyAlertsApi = {
  list: (userId: string) =>
    api.get(`/anomaly_alerts?user_id=eq.${userId}&select=*,transaction:transactions(*)&order=created_at.desc`),

  create: (data: unknown) =>
    api.post('/anomaly_alerts', data),

  resolve: (id: string) =>
    api.patch(`/anomaly_alerts?id=eq.${id}`, { is_resolved: true }),
};

// Transactions - anomaly flag updates
export const anomalyUpdateApi = {
  flagAnomaly: (id: string, score: number) =>
    api.patch(`/transactions?id=eq.${id}`, { is_anomaly: true, anomaly_score: score }),
};

// Receipts
export const receiptsApi = {
  list: (userId: string) =>
    api.get(`/receipts?user_id=eq.${userId}&order=created_at.desc`),

  create: (data: unknown) =>
    api.post('/receipts', data),
};

// Insights
export const insightsApi = {
  list: (userId: string) =>
    api.get(`/insights?user_id=eq.${userId}&order=created_at.desc`),

  create: (data: unknown) =>
    api.post('/insights', data),

  markRead: (id: string) =>
    api.patch(`/insights?id=eq.${id}`, { is_read: true }),
};

// Profiles
export const profilesApi = {
  get: (userId: string) =>
    api.get(`/profiles?id=eq.${userId}&select=monthly_budget`).then((r) => r.data?.[0] ?? null),
};

// Edge Functions
export const edgeFunctionsApi = {
  anomalyDetect: (transactions: unknown[]) => {
    return axios.post(
      `${supabaseUrl}/functions/v1/anomaly-detect`,
      { transactions },
      {
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  },

  ocrReceipt: (imageUrl: string, rawText: string) => {
    return axios.post(
      `${supabaseUrl}/functions/v1/ocr-receipt`,
      { image_url: imageUrl, raw_text: rawText },
      {
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  },
};

export default api;
