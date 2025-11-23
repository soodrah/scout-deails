
import React, { useEffect, useState } from 'react';
import { Home, Briefcase, User } from 'lucide-react';
import { Deal, AppMode, UserLocation } from './types';
import { fetchNearbyDeals } from './services/geminiService';
import ConsumerView from './components/ConsumerView';
import AdminView from './components/AdminView';
import ProfileView from './components/ProfileView';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.CONSUMER);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<UserLocation>({ 
    lat: 34.0522, 
    lng: -118.2437, 
    city: "Los Angeles" 
  });

  useEffect(() => {
    // Simulate getting user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // In a real app, reverse geocode here. We'll stick to a default city name for demo.
          const userLoc = { lat: latitude, lng: longitude, city: "Current Location" };
          setLocation(userLoc);
          loadDeals(userLoc);
        },
        (error) => {
          console.log("Using default location");
          loadDeals(location);
        }
      );
    } else {
      loadDeals(location);
    }
  }, []);

  const loadDeals = async (loc: UserLocation) => {
    setLoading(true);
    const data = await fetchNearbyDeals(loc.lat, loc.lng, loc.city);
    setDeals(data);
    setLoading(false);
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.CONSUMER:
        return <ConsumerView deals={deals} loading={loading} locationName={location.city || "Unknown"} />;
      case AppMode.ADMIN:
        return <AdminView location={location} />;
      case AppMode.PROFILE:
        return <ProfileView />;
      default:
        return <ConsumerView deals={deals} loading={loading} locationName={location.city || "Unknown"} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative shadow-2xl overflow-hidden">
      
      {/* Main Content Area */}
      <div className="h-full min-h-screen">
        {renderContent()}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-around z-40 pb-safe">
        <button 
          onClick={() => setMode(AppMode.CONSUMER)}
          className={`flex flex-col items-center space-y-1 transition-colors ${mode === AppMode.CONSUMER ? 'text-gray-900' : 'text-gray-400'}`}
        >
          <Home className={`w-6 h-6 ${mode === AppMode.CONSUMER ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-medium">Deals</span>
        </button>

        {/* Profile Button - Center */}
        <button 
          onClick={() => setMode(AppMode.PROFILE)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${mode === AppMode.PROFILE ? 'bg-gray-900 shadow-lg ring-4 ring-gray-100 scale-105' : 'bg-gray-900 hover:bg-gray-800'}`}
        >
           <User className={`w-5 h-5 text-white`} />
        </button>

        <button 
          onClick={() => setMode(AppMode.ADMIN)}
          className={`flex flex-col items-center space-y-1 transition-colors ${mode === AppMode.ADMIN ? 'text-emerald-600' : 'text-gray-400'}`}
        >
          <Briefcase className={`w-6 h-6 ${mode === AppMode.ADMIN ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-medium">Admin</span>
        </button>
      </div>
    </div>
  );
}

export default App;
