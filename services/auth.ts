
import { supabase, supabaseUrl } from './supabase';

export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signInWithOAuth: async (provider: 'google' | 'facebook') => {
    // For PWAs (Progressive Web Apps) running on iOS, we rely on the browser's redirect flow.
    const redirectUrl = window.location.origin;
    const googleCallbackUrl = `${supabaseUrl}/auth/v1/callback`;

    // --- DEBUGGING HELP FOR USER ---
    console.group("🔐 OAuth Configuration Check");
    console.log(`%c1. GOOGLE CLOUD CONSOLE (Authorized redirect URIs):`, "font-weight:bold; color:blue");
    console.log(`   👉 ${googleCallbackUrl}`);
    console.log("   (Add this in Google Cloud Console -> APIs & Services -> Credentials)");
    
    console.log(`%c2. SUPABASE DASHBOARD (Redirect URLs):`, "font-weight:bold; color:green");
    console.log(`   👉 ${redirectUrl}`);
    console.log("   (Add this in Supabase -> Authentication -> URL Configuration)");
    console.groupEnd();
    // -------------------------------

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          // 'select_account' forces the Google account chooser to appear.
          // This fixes the "403 That's an error" loop by ensuring a fresh login flow 
          // without triggering the aggressive "consent" screen blocks.
          prompt: 'select_account',
          access_type: 'offline'
        }
      }
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  onAuthStateChange: (callback: (session: any) => void) => {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  }
};
