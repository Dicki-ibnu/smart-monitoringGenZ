import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Ini alarm peringatan untuk debugging
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Gawat! File .env tidak terbaca. supabaseUrl:", supabaseUrl);
  throw new Error("Missing Supabase environment variables. Check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);