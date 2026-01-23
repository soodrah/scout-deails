
import { supabase } from './supabase';

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
    // The credentials.plist is NOT used here because we are technically in a browser environment (Safari/Chrome),
    // even when installed on the home screen.
    
    // We get the current origin (e.g., http://localhost:5173 or https://myapp.com)
    // Make sure this URL is added to your Supabase Auth > URL Configuration > Redirect URLs
    const redirectUrl = window.location.origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        // Removed 'prompt: consent' to avoid desktop compatibility issues with Google Sign-In
        // queryParams: { prompt: 'consent' } 
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
