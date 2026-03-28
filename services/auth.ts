
import { supabase, supabaseUrl } from './supabase';

// Check if we are running in a Capacitor environment
const isCapacitor = window.location.protocol === 'capacitor:' || window.location.protocol === 'file:';

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
    // Determine the Redirect URL based on environment
    // For iOS Capacitor, this is typically 'capacitor://localhost'
    const redirectUrl = window.location.origin;

    // --- DEBUGGING HELP FOR USER ---
    console.group("🔐 OAuth Configuration Check");
    console.log(`%c1. ENVIRONMENT:`, "font-weight:bold; color:purple");
    console.log(`   👉 ${isCapacitor ? 'Mobile App (Capacitor)' : 'Web Browser'}`);
    
    console.log(`%c2. SUPABASE REDIRECT URL (Must match exactly in Supabase):`, "font-weight:bold; color:green");
    console.log(`   👉 ${redirectUrl}`);
    console.log("   (Add this in Supabase -> Authentication -> URL Configuration)");

    if (isCapacitor) {
        console.warn("⚠️ Google Sign-In on iOS might require specific Deep Links configuration to return to the app.");
        console.warn("   For testing on device easily, use Email/Password sign-in.");
    }
    console.groupEnd();
    // -------------------------------

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        queryParams: {
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
