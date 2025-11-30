
import React, { useState, useEffect } from 'react';
import { MapPin, Search, Filter, RefreshCw, Loader2, X, Sparkles, Navigation } from 'lucide-react';
import { Deal } from '../types';
import DealCard from './DealCard';
import RedeemModal from './RedeemModal';
import { db } from '../services/db';
import { searchLocalPlaces } from '../services/geminiService';

interface ConsumerViewProps {
  deals: Deal[]; // These are AI deals passed from App.tsx
  loading: boolean;
  locationName: string;
  userId?: string;
  onSearch?: (query: string) => void;
}

const ConsumerView: React.FC<ConsumerViewProps> = ({ deals: aiDeals, loading: aiLoading, locationName, userId, onSearch }) => {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [filter, setFilter] = useState<'all' | 'food' | 'retail' | 'service'>('all');
  const [dbDeals, setDbDeals] = useState<Deal[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiPlaces, setAiPlaces] = useState<any[]>([]);
  const [aiPlacesLoading, setAiPlacesLoading] = useState(false);

  // Track saved deals locally for immediate UI updates
  const [savedDealIds, setSavedDealIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchRealDeals = async () => {
      setDbLoading(true);
      const realDeals = await db.getDeals();
      setDbDeals(realDeals);
      setDbLoading(false);
    };
    
    fetchRealDeals();
  }, []);

  useEffect(() => {
    // Fetch saved deals if logged in
    const fetchSaved = async () => {
      if (userId) {
        const saved = await db.getSavedDeals(userId);
        setSavedDealIds(new Set(saved.map(d => d.id)));
      }
    };
    fetchSaved();
  }, [userId]);

  const handleSave = async (deal: Deal) => {
    if (!userId) {
      alert("Please sign in to save deals!");
      return;
    }

    // Optimistic Update
    const newSaved = new Set(savedDealIds);
    if (newSaved.has(deal.id)) {
      newSaved.delete(deal.id);
    } else {
      newSaved.add(deal.id);
    }
    setSavedDealIds(newSaved);

    // DB Update
    await db.toggleSaveDeal(userId, deal.id);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;

      if (isAiMode) {
          // AI Map Search
          setAiPlacesLoading(true);
          // We assume a default location if geolocation failed (34, -118)
          const results = await searchLocalPlaces(searchQuery, 34.05, -118.25);
          setAiPlaces(results);
          setAiPlacesLoading(false);
          setIsSearching(false); // Close search bar to show results
      } else {
          // Standard City Search
          if (onSearch) {
              onSearch(searchQuery);
              setIsSearching(false);
          }
      }
  };

  // Merge Real DB deals with AI deals (Real deals first)
  const allDeals = [...dbDeals, ...aiDeals];

  const filteredDeals = filter === 'all' 
    ? allDeals 
    : allDeals.filter(d => d.category === filter);

  const isLoading = aiLoading || dbLoading;

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4">
        
        {isSearching ? (
             <form onSubmit={handleSearchSubmit} className="mb-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 relative">
                        <input 
                            autoFocus
                            type="text" 
                            placeholder={isAiMode ? "Ask Gemini (e.g. Best sushi nearby)" : "Enter city (e.g. Mumbai)"} 
                            className={`w-full rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 transition-all ${isAiMode ? 'bg-indigo-50 focus:ring-indigo-500' : 'bg-gray-100 focus:ring-gray-900'}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {isAiMode ? (
                            <Sparkles className="w-4 h-4 text-indigo-500 absolute left-3 top-2.5" />
                        ) : (
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        )}
                    </div>
                    <button type="button" onClick={() => setIsSearching(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* AI Toggle */}
                <div 
                    onClick={() => setIsAiMode(!isAiMode)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg w-fit text-xs font-semibold cursor-pointer transition-all ${isAiMode ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-500'}`}
                >
                    <Sparkles className="w-3 h-3" />
                    {isAiMode ? "Ask AI Active" : "Ask AI"}
                </div>
             </form>
        ) : (
            <div className="flex items-center justify-between mb-4 animate-in fade-in duration-200">
            <div className="flex items-center text-gray-800">
                <div className="bg-emerald-100 p-2 rounded-full mr-3">
                <MapPin className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Current Location</p>
                <h1 className="text-sm font-bold truncate max-w-[200px]">{locationName}</h1>
                </div>
            </div>
            <button onClick={() => setIsSearching(true)} className="p-2 bg-gray-50 rounded-full text-gray-600 hover:bg-gray-100">
                <Search className="w-5 h-5" />
            </button>
            </div>
        )}

        {/* Categories (Only show if not viewing AI results) */}
        {!aiPlaces.length && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {['all', 'food', 'retail', 'service'].map((cat) => (
                <button
                key={cat}
                onClick={() => setFilter(cat as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === cat 
                    ? 'bg-gray-900 text-white shadow-md' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
                >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
            ))}
            </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        
        {/* AI Results Section */}
        {aiPlacesLoading && (
            <div className="py-8 flex flex-col items-center justify-center text-indigo-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm font-medium">Gemini is searching maps...</p>
            </div>
        )}

        {aiPlaces.length > 0 && (
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        AI Recommendations
                    </h2>
                    <button onClick={() => setAiPlaces([])} className="text-xs text-gray-400">Clear</button>
                </div>
                <div className="space-y-3">
                    {aiPlaces.map((place, i) => (
                        <a 
                            key={i} 
                            href={place.uri} 
                            target="_blank" 
                            rel="noreferrer"
                            className="block bg-indigo-50 p-4 rounded-xl border border-indigo-100 active:scale-[0.98] transition-transform"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900">{place.title}</h3>
                                    <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                                        <Navigation className="w-3 h-3" />
                                        View on Maps
                                    </p>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        )}

        {/* Regular Deals */}
        {isLoading && dbDeals.length === 0 ? (
          <div className="space-y-4">
             <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
             </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse shadow-sm border border-gray-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {!aiPlaces.length && (
                <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-gray-900">Nearby Deals</h2>
                <span className="text-xs text-gray-500">{filteredDeals.length} results</span>
                </div>
            )}
            
            {filteredDeals.map(deal => (
              <DealCard 
                key={deal.id} 
                deal={deal} 
                onRedeem={setSelectedDeal}
                onSave={userId ? handleSave : undefined}
                isSaved={savedDealIds.has(deal.id)}
              />
            ))}

            {filteredDeals.length === 0 && !aiPlaces.length && (
              <div className="text-center py-12 text-gray-400">
                <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No deals found in this category.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <RedeemModal 
        deal={selectedDeal} 
        userId={userId}
        onClose={() => setSelectedDeal(null)} 
      />
    </div>
  );
};

export default ConsumerView;
