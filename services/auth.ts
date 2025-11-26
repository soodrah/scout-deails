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
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // This ensures the user is sent back to your deployed URL after Google/Facebook approves them
        redirectTo: window.location.origin, 
        queryParams: {
          // Forces the consent screen to appear, which helps avoid issues where 
          // a user clicks login and nothing happens because they are already signed in vaguely.
          prompt: 'consent',
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