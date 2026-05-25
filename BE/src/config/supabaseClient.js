import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Pakai service_role key untuk bypass RLS (Row Level Security)
export const supabase = createClient(supabaseUrl, supabaseKey);