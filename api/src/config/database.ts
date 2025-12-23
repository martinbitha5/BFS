import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// #region agent log
fetch('http://127.0.0.1:7242/ingest/2e82e369-b2c3-4892-be74-bf76a361a519',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:6',message:'Database config check',data:{hasSupabaseUrl:!!process.env.SUPABASE_URL,hasServiceKey:!!process.env.SUPABASE_SERVICE_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

// Initialize Supabase client
// If config is missing, create a client with placeholder values that will fail gracefully at runtime
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'placeholder-key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn('⚠️  WARNING: Supabase configuration missing.');
  console.warn('   Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.');
  console.warn('   Routes requiring Supabase will fail with connection errors.');
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2e82e369-b2c3-4892-be74-bf76a361a519',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:16',message:'Supabase config missing - using placeholder',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
} else {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/2e82e369-b2c3-4892-be74-bf76a361a519',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:21',message:'Supabase client created',data:{urlConfigured:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
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
