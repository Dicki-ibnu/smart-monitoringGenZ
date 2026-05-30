const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Pakai service_role key untuk bypass RLS (Row Level Security)
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;