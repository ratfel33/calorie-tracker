import { createClient } from '@supabase/supabase-js';

// 1. Grab the keys dynamically from your .env.local file using process.env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 2. Safety Check: If the keys are missing, throw a clear error in the terminal
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase Environment Variables! Check your .env.local file layout.'
  );
}

// 3. Initialize the client securely
export const supabase = createClient(supabaseUrl, supabaseAnonKey);