import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Mode test : permet de démarrer sans vraie config Supabase
const useMockData = process.env.USE_MOCK_DATA === 'true';

if (!useMockData && (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)) {
  throw new Error('Missing Supabase configuration. Please check your .env file.');
}

// En mode test, on utilise des valeurs par défaut
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'test_key';

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

export const isMockMode = useMockData;
