import { createClient } from '@supabase/supabase-js';

// Best Practice: Use Environment Variables
// In a real deployment, these should be set in your CI/CD or Hosting Provider (e.g., Vercel, Netlify).
// Note: The SUPABASE_ANON_KEY is safe to expose in the browser IF you have enabled Row Level Security (RLS) 
// on your database tables to restrict access.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://npcyraahocrobtileked.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wY3lyYWFob2Nyb2J0aWxla2VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxMjIyMDEsImV4cCI6MjA3OTY5ODIwMX0.lvBzigsucDtCuu3_yf_3_WbaQfGI4vXLZbBB6Z532Ss';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase keys are missing! Please set SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);