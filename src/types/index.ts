export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  monthly_budget: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  description: string;
  source: 'e-wallet' | 'mobile-banking' | 'cash' | 'debit-card' | 'credit-card' | 'transfer';
  type: 'expense' | 'income';
  is_anomaly: boolean;
  anomaly_score: number;
  receipt_url: string | null;
  transaction_date: string;
  created_at: string;
  category?: Category;
}

export interface AnomalyAlert {
  id: string;
  user_id: string;
  transaction_id: string | null;
  alert_type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  is_resolved: boolean;
  created_at: string;
  transaction?: Transaction;
}

export interface Receipt {
  id: string;
  user_id: string;
  transaction_id: string | null;
  image_url: string;
  ocr_raw_text: string;
  ocr_status: 'pending' | 'processed' | 'failed';
  merchant_name: string | null;
  total_amount: number | null;
  transaction_date: string | null;
  created_at: string;
}

export interface Insight {
  id: string;
  user_id: string;
  insight_type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  is_read: boolean;
  created_at: string;
}

export type TransactionSource = Transaction['source'];
export type TransactionType = Transaction['type'];
