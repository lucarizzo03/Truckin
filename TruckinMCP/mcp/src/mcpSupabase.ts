import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';

// load the repo-level .env (works from both src and build dirs)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Missing Supabase credentials: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in TruckinMCP/.env or TruckinMCP/mcp/.env'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);