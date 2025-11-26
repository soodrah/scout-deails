
import { createClient } from '@supabase/supabase-js';

// Default Keys (Fallback) - Only works if you ran the SQL on THIS specific project.
// You should connect to YOUR own project.
const DEFAULT_URL = 'https://npcyraahocrobtileked.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY3lyYWFob2Nyb2J0aWxla2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMjIyMDEsImV4cCI6MjA3OTY5ODIwMX0.lvBzigsucDtCuu3_yf_3_WbaQfGI4vXLZbBB6Z532Ss';

let supabaseUrl = DEFAULT_URL;
let supabaseAnonKey = DEFAULT_ANON_KEY;
let usingDefault = true;

// Safely try to load from Vite Environment Variables
try {
  const env = (import.meta as any).env;
  
  // LOGGING FOR DEBUGGING (Will show in browser console)
  if (!env?.VITE_SUPABASE_URL) {
    console.warn("VITE_SUPABASE_URL is missing. Using default fallback.");
  } else {
    console.log("Using VITE_SUPABASE_URL from environment.");
    supabaseUrl = env.VITE_SUPABASE_URL;
    usingDefault = false;
  }

  if (env?.VITE_SUPABASE_ANON_KEY) {
    supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;
  }
} catch (error) {
  console.debug('Using default Supabase keys (Env load failed)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
