import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
// If config is missing, create a client with placeholder values that will fail gracefully at runtime
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  if (process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  WARNING: Supabase configuration missing.');
  console.warn('   Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.');
  console.warn('   Routes requiring Supabase will fail with connection errors.');
  }
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
