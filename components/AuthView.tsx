
import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, HelpCircle } from 'lucide-react';
import { auth } from '../services/auth';
import { AppMode } from '../types';
import { supabaseUrl } from '../services/supabase';

interface AuthViewProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onCancel }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await auth.signIn(email, password);
        if (error) throw error;
      } else {
        const { error } = await auth.signUp(email, password);
        if (error) throw error;
        // Auto sign in happens if email confirmation is disabled
      }
      onSuccess();
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setError(null);
    try {
      const { error } = await auth.signInWithOAuth(provider);
      if (error) throw error;
      // Note: OAuth redirects the browser, so we don't need to manually call onSuccess here immediately
    } catch (err: any) {
      console.error("OAuth Error:", err);
      // Clean up error message for display
      const msg = err.message || `Failed to sign in with ${provider}`;
      setError(msg);
    }
  };

  return (
    <div className="h-full flex flex-col justify-center px-8 bg-white animate-in slide-in-from-bottom-4 duration-300">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-gray-500">
          {isLogin ? 'Sign in to access your deals' : 'Join Scout to start saving today'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              required
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all bg-gray-50"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1 ml-1">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              required
              minLength={6}
              className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all bg-gray-50"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all mt-6"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-400 font-medium">Or continue with</span>
        </div>
      </div>

      <div className="mt-6">
        <button 
          type="button"
          onClick={() => handleOAuth('google')}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors active:scale-95"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="font-semibold text-gray-700 text-sm">Continue with Google</span>
        </button>
      </div>

      <div className="mt-8 text-center space-y-4">
        <p className="text-gray-600 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-bold text-emerald-600 hover:text-emerald-700"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>

        <button 
          onClick={() => setShowTroubleshoot(!showTroubleshoot)}
          className="text-xs text-gray-400 flex items-center justify-center gap-1 mx-auto hover:text-gray-600"
        >
          <HelpCircle className="w-3 h-3" />
          Troubleshoot Login
        </button>

        {showTroubleshoot && (
          <div className="bg-gray-100 p-4 rounded-xl text-left text-xs font-mono text-gray-600 space-y-2 break-all">
            <p><strong>Config Checklist:</strong></p>
            <div>
              <span className="block text-gray-400">1. Google Console "Authorized Redirect URI":</span>
              <span className="text-blue-600 select-all">{supabaseUrl}/auth/v1/callback</span>
            </div>
            <div>
              <span className="block text-gray-400">2. Supabase "Redirect URLs":</span>
              <span className="text-green-600 select-all">{window.location.origin}</span>
            </div>
             <p className="text-gray-500 italic mt-2">Ensure the Client ID in Supabase matches your Google Console project.</p>
          </div>
        )}
      </div>

      <button onClick={onCancel} className="mt-4 text-xs text-gray-400 hover:text-gray-600 mx-auto block">
        Skip for now (Browse Only)
      </button>
    </div>
  );
};

export default AuthView;
