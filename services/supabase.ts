
import { createClient } from '@supabase/supabase-js';

// Default Keys (Fallback)
const DEFAULT_URL = 'https://npcyraahocrobtileked.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY3lyYWFob2Nyb2J0aWxla2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMjIyMDEsImV4cCI6MjA3OTY5ODIwMX0.lvBzigsucDtCuu3_yf_3_WbaQfGI4vXLZbBB6Z532Ss';

let supabaseUrl = DEFAULT_URL;
let supabaseAnonKey = DEFAULT_ANON_KEY;

// Safely try to load from Vite Environment Variables using optional chaining
// This prevents crashes if import.meta.env is undefined
try {
  const env = (import.meta as any).env;
  if (env?.VITE_SUPABASE_URL) {
    supabaseUrl = env.VITE_SUPABASE_URL;
  }
  if (env?.VITE_SUPABASE_ANON_KEY) {
    supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
  }
} catch (error) {
  // Ignore errors if import.meta is not available
  console.debug('Using default Supabase keys');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
