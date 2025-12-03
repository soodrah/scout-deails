
import React, { useEffect, useState } from 'react';
import { Home, Briefcase, User } from 'lucide-react';
import { Deal, AppMode, UserLocation } from './types';
import { fetchNearbyDeals, reverseGeocode, geocodeCity } from './services/geminiService';
import { auth } from './services/auth';
import ConsumerView from './components/ConsumerView';
import AdminView from './components/AdminView';
import ProfileView from './components/ProfileView';
import HomeView from './components/HomeView';
import AuthView from './components/AuthView';

// CONSTANTS
const ADMIN_EMAIL = 'soodrah@gmail.com';

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
    // We apply the class to the html element or a wrapper. 
    // Since we are wrapping the content below, we will handle it in the render.
  }, [settings]);

  const toggleDarkMode = () => {
    setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }));
  };

  // Derived State
  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  useEffect(() => {
    // 1. Check for active session
    auth.getSession().then(({ session }) => setSession(session));

    // 2. Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange((session) => {
      setSession(session);
      // If user logs out while in Admin or Profile, go home
      if (!session && (mode === AppMode.ADMIN || mode === AppMode.PROFILE)) {
        setMode(AppMode.CONSUMER);
      }
    });

    // 3. Get Location & AI Deals
    // Only run this if we are not already loading deals and location is default
    if (navigator.geolocation && mode !== AppMode.HOME) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Use AI to get the real city name from coordinates
          try {
              const cityName = await reverseGeocode(latitude, longitude);
              const userLoc = { lat: latitude, lng: longitude, city: cityName }; 
              setLocation(userLoc);
              loadDeals(userLoc);
          } catch (e) {
              // Fallback
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
          // Reload deals for the new location
          const data = await fetchNearbyDeals(result.lat, result.lng, result.city);
          setDeals(data);
      } else {
          alert(`Could not find location: ${query}`);
      }
      setLoading(false);
  };

  const handleProtectedNavigation = (targetMode: AppMode) => {
    if (!session) {
        // If not logged in, go to Auth
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
        />;
      
      case AppMode.ADMIN:
        // Double Check: Only show Admin view if authorized
        if (session && isAdmin) {
            return <AdminView location={location} />;
        } else if (session && !isAdmin) {
             return <ConsumerView deals={deals} loading={loading} locationName={location.city || "Unknown"} userId={session?.user?.id} onSearch={handleSearch} />;
        } else {
            return <AuthView onSuccess={() => {
                // After login, only go to Admin if they are the admin
                setMode(AppMode.CONSUMER); 
            }} onCancel={() => setMode(AppMode.CONSUMER)} />;
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
        return <ConsumerView deals={deals} loading={loading} locationName={location.city || "Unknown"} onSearch={handleSearch} />;
    }
  };

  return (
    <div className={`${settings.darkMode ? 'dark' : ''}`}>
      <div className="h-screen bg-gray-50 dark:bg-gray-900 max-w-md mx-auto relative shadow-2xl overflow-y-auto no-scrollbar transition-colors duration-300">
        
        {/* Main Content Area */}
        <div className="min-h-full h-full">
          {renderContent()}
        </div>

        {/* Bottom Navigation Bar - Only show if NOT in HOME or AUTH mode */}
        {mode !== AppMode.HOME && mode !== AppMode.AUTH && (
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-around z-40 pb-safe transition-colors duration-300">
            <button 
              onClick={() => setMode(AppMode.CONSUMER)}
              className={`flex flex-col items-center space-y-1 transition-colors ${mode === AppMode.CONSUMER ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}
            >
              <Home className={`w-6 h-6 ${mode === AppMode.CONSUMER ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-medium">Deals</span>
            </button>

            {/* Profile Button - Center */}
            <button 
              onClick={() => handleProtectedNavigation(AppMode.PROFILE)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${mode === AppMode.PROFILE ? 'bg-gray-900 dark:bg-white shadow-lg ring-4 ring-gray-100 dark:ring-gray-800 scale-105' : 'bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200'}`}
            >
              <User className={`w-5 h-5 text-white dark:text-gray-900`} />
            </button>

            {/* Admin Button - STRICTLY RESTRICTED to soodrah@gmail.com */}
            {isAdmin && (
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
