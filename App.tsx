
import React, { useEffect, useState } from 'react';
import { Home, Briefcase, User, ShieldAlert, Copy, RefreshCw } from 'lucide-react';
import { Deal, AppMode, UserLocation } from './types';
import { fetchNearbyDeals, reverseGeocode, geocodeCity } from './services/geminiService';
import { auth } from './services/auth';
import { db } from './services/db'; // Import DB service
import ConsumerView from './components/ConsumerView';
import AdminView from './components/AdminView';
import ProfileView from './components/ProfileView';
import HomeView from './components/HomeView';
import AuthView from './components/AuthView';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<UserLocation>({ 
    lat: 34.0522, 
    lng: -118.2437, 
    city: "Los Angeles" 
  });
  
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false); // New State: dynamic role check
  const [userRole, setUserRole] = useState<string>('guest'); // Track actual role for debugging
  const [roleLoading, setRoleLoading] = useState(false);

  // Settings State (Lifted from ProfileView)
  const [settings, setSettings] = useState<{
    darkMode: boolean;
    sound: boolean;
    haptic: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('lokal_app_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load settings", e);
    }
    return {
      darkMode: false,
      sound: true,
      haptic: true
    };
  });

  // Persist settings and Apply Dark Mode Class
  useEffect(() => {
    localStorage.setItem('lokal_app_settings', JSON.stringify(settings));
  }, [settings]);

  const toggleDarkMode = () => {
    setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }));
  };

  useEffect(() => {
    // 1. Check for active session
    auth.getSession().then(({ session }) => {
        setSession(session);
        checkAdminRole(session?.user?.id);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((session) => {
      setSession(session);
      checkAdminRole(session?.user?.id);
      
      // If user logs out while in Admin or Profile, go home
      if (!session && (mode === AppMode.ADMIN || mode === AppMode.PROFILE)) {
        setMode(AppMode.CONSUMER);
      }
    });

    // 3. Get Location & AI Deals
    if (navigator.geolocation && mode !== AppMode.HOME) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
              const cityName = await reverseGeocode(latitude, longitude);
              const userLoc = { lat: latitude, lng: longitude, city: cityName }; 
              setLocation(userLoc);
              loadDeals(userLoc);
          } catch (e) {
              const userLoc = { lat: latitude, lng: longitude, city: "Current Location" }; 
              setLocation(userLoc);
              loadDeals(userLoc);
          }
        },
        (error) => {
          console.log("Using default location or user denied permission");
          loadDeals(location);
        }
      );
    } else if (mode !== AppMode.HOME) {
      loadDeals(location);
    }

    return () => subscription.unsubscribe();
  }, [mode]);

  // Helper to fetch role from DB
  const checkAdminRole = async (userId?: string) => {
      if (!userId) {
          setIsAdmin(false);
          setUserRole('guest');
          return;
      }
      setRoleLoading(true);
      const profile = await db.getUserProfile(userId);
      console.log(`[App] Checked Role for ${userId}:`, profile?.role); 
      setUserRole(profile?.role || 'consumer');
      setIsAdmin(profile?.role === 'admin');
      setRoleLoading(false);
  };

  const loadDeals = async (loc: UserLocation) => {
    setLoading(true);
    const data = await fetchNearbyDeals(loc.lat, loc.lng, loc.city);
    setDeals(data);
    setLoading(false);
  };

  const handleSearch = async (query: string) => {
      setLoading(true);
      const result = await geocodeCity(query);
      if (result) {
          setLocation({
              lat: result.lat,
              lng: result.lng,
              city: result.city
          });
          const data = await fetchNearbyDeals(result.lat, result.lng, result.city);
          setDeals(data);
      } else {
          alert(`Could not find location: ${query}`);
      }
      setLoading(false);
  };

  const handleProtectedNavigation = (targetMode: AppMode) => {
    if (!session) {
        setMode(AppMode.AUTH);
    } else {
        setMode(targetMode);
    }
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.HOME:
        return <HomeView onGetStarted={() => setMode(AppMode.CONSUMER)} />;
      
      case AppMode.AUTH:
        return <AuthView onSuccess={() => setMode(AppMode.CONSUMER)} onCancel={() => setMode(AppMode.CONSUMER)} />;
      
      case AppMode.CONSUMER:
        return <ConsumerView 
            deals={deals} 
            loading={loading} 
            locationName={location.city || "Unknown"} 
            userId={session?.user?.id} 
            onSearch={handleSearch}
            userLocation={location}
        />;
      
      case AppMode.ADMIN:
        if (session && isAdmin) {
            return <AdminView location={location} />;
        } else if (session && !isAdmin) {
             // Access Denied View - UPDATED FOR DEBUGGING
             return (
               <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                 <div className="bg-red-50 p-4 rounded-full mb-4">
                   <ShieldAlert className="w-12 h-12 text-red-500" />
                 </div>
                 <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Restricted</h2>
                 <p className="text-gray-500 mb-6">
                   You are logged in, but your role is <strong>{userRole}</strong>.
                 </p>
                 
                 {/* Refresh Button */}
                 <button 
                   onClick={() => checkAdminRole(session?.user?.id)}
                   className="mb-8 flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg text-sm font-semibold active:scale-95 transition-all"
                 >
                   <RefreshCw className={`w-4 h-4 ${roleLoading ? 'animate-spin' : ''}`} />
                   {roleLoading ? 'Checking...' : 'Refresh Permissions'}
                 </button>
                 
                 {/* DEBUGGING CARD FOR USER */}
                 <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl text-left w-full mb-8 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Debug Info (For SQL Fix)</p>
                    <div className="space-y-2">
                        <div>
                            <span className="text-xs text-gray-400 block">Email</span>
                            <span className="text-sm font-mono text-gray-800 dark:text-white select-all">{session.user.email}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 block">Your User ID</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-gray-800 dark:text-white select-all break-all">{session.user.id}</span>
                                <button onClick={() => navigator.clipboard.writeText(session.user.id)} className="p-1 hover:bg-gray-200 rounded">
                                    <Copy className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                        </div>
                    </div>
                 </div>

                 <p className="text-sm text-gray-400 mb-4 font-mono text-left bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800">
                   <strong>Fix:</strong> Copy the ID above. Go to Supabase SQL Editor and run:<br/><br/>
                   <code>UPDATE profiles SET role = 'admin' WHERE id = 'PASTE_ID_HERE';</code>
                 </p>

                 <button 
                   onClick={() => setMode(AppMode.CONSUMER)}
                   className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold"
                 >
                   Back to Deals
                 </button>
               </div>
             );
        } else {
            return <AuthView onSuccess={() => {}} onCancel={() => setMode(AppMode.CONSUMER)} />;
        }
      
      case AppMode.PROFILE:
        return session ? (
          <ProfileView 
            user={session.user} 
            onLogout={() => setMode(AppMode.HOME)} 
            settings={settings}
            onToggleDarkMode={toggleDarkMode}
          />
        ) : (
          <AuthView onSuccess={() => setMode(AppMode.PROFILE)} onCancel={() => setMode(AppMode.CONSUMER)} />
        );
      
      default:
        return <ConsumerView deals={deals} loading={loading} locationName={location.city || "Unknown"} onSearch={handleSearch} userLocation={location} />;
    }
  };

  return (
    <div className={`${settings.darkMode ? 'dark' : ''}`}>
      {/* Updated Container: w-full instead of max-w-md, and removed shadow-2xl for native feel */}
      <div className="h-screen bg-gray-50 dark:bg-gray-900 w-full relative overflow-y-auto no-scrollbar transition-colors duration-300">
        <div className="min-h-full h-full">
          {renderContent()}
        </div>

        {mode !== AppMode.HOME && mode !== AppMode.AUTH && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-around z-40 pb-safe transition-colors duration-300">
            <button 
              onClick={() => setMode(AppMode.CONSUMER)}
              className={`flex flex-col items-center space-y-1 transition-colors ${mode === AppMode.CONSUMER ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}
            >
              <Home className={`w-6 h-6 ${mode === AppMode.CONSUMER ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-medium">Deals</span>
            </button>

            <button 
              onClick={() => handleProtectedNavigation(AppMode.PROFILE)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${mode === AppMode.PROFILE ? 'bg-gray-900 dark:bg-white shadow-lg ring-4 ring-gray-100 dark:ring-gray-800 scale-105' : 'bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200'}`}
            >
              <User className={`w-5 h-5 text-white dark:text-gray-900`} />
            </button>

            {/* Owner Tab (Admin Only) - STRICT CHECK */}
            {session?.user && isAdmin && (
                <button 
                    onClick={() => setMode(AppMode.ADMIN)}
                    className={`flex flex-col items-center space-y-1 transition-colors ${mode === AppMode.ADMIN ? 'text-emerald-600' : 'text-gray-400'}`}
                >
                    <Briefcase className={`w-6 h-6 ${mode === AppMode.ADMIN ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-medium">Owner</span>
                </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
