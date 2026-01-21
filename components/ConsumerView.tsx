
import React, { useState, useEffect } from 'react';
import { MapPin, Search, Filter, RefreshCw, Loader2, X, Sparkles, Navigation, Clock, Trash2 } from 'lucide-react';
import { Deal, UserLocation, PromptHistory } from '../types';
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
  userLocation?: UserLocation;
}

const ConsumerView: React.FC<ConsumerViewProps> = ({ deals: aiDeals, loading: aiLoading, locationName, userId, onSearch, userLocation }) => {
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

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [promptHistory, setPromptHistory] = useState<PromptHistory[]>([]);

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
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const history = await db.getPromptHistory('search');
    setPromptHistory(history);
  };

  useEffect(() => {
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
    const newSaved = new Set(savedDealIds);
    if (newSaved.has(deal.id)) {
      newSaved.delete(deal.id);
    } else {
      newSaved.add(deal.id);
    }
    setSavedDealIds(newSaved);
    await db.toggleSaveDeal(userId, deal.id);
  };

  const handleSearchSubmit = async (e?: React.FormEvent, overrideQuery?: string) => {
      if (e) e.preventDefault();
      const queryToUse = overrideQuery || searchQuery;
      if (!queryToUse.trim()) return;

      if (isAiMode) {
          setAiPlacesLoading(true);
          const lat = userLocation?.lat || 34.05;
          const lng = userLocation?.lng || -118.25;

          // Save to History
          await db.savePrompt({
            type: 'search',
            prompt: queryToUse,
            metadata: { lat, lng }
          });
          loadHistory();

          const results = await searchLocalPlaces(queryToUse, lat, lng);
          setAiPlaces(results);
          setAiPlacesLoading(false);
          setIsSearching(false); 
          setShowHistory(false);
      } else {
          if (onSearch) {
              onSearch(queryToUse);
              setIsSearching(false);
              setShowHistory(false);
          }
      }
  };

  const handleClearHistory = async () => {
    if (confirm("Clear your search history?")) {
      await db.clearPromptHistory();
      setPromptHistory([]);
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
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-4 transition-colors duration-300">
        
        {isSearching ? (
             <form onSubmit={handleSearchSubmit} className="mb-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 relative">
                        <input 
                            autoFocus
                            type="text" 
                            placeholder={isAiMode ? "Search Deals (Food, Retail, Services...)" : "Enter city (e.g. Mumbai)"} 
                            className={`w-full rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 transition-all dark:text-white ${isAiMode ? 'bg-indigo-50 dark:bg-indigo-900/30 focus:ring-indigo-500' : 'bg-gray-100 dark:bg-gray-800 focus:ring-gray-900 dark:focus:ring-gray-600'}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {isAiMode ? (
                            <Sparkles className="w-4 h-4 text-indigo-500 absolute left-3 top-2.5" />
                        ) : (
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        )}
                    </div>
                    <button type="button" onClick={() => { setIsSearching(false); setShowHistory(false); }} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* AI & History Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <div 
                        onClick={() => setIsAiMode(!isAiMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${isAiMode ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
                    >
                        <Sparkles className="w-3 h-3" />
                        {isAiMode ? "Ask AI Active" : "Ask AI"}
                    </div>
                    
                    {promptHistory.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => setShowHistory(!showHistory)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${showHistory ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
                      >
                        <Clock className="w-3 h-3" />
                        History
                      </button>
                    )}
                  </div>
                </div>

                {/* History Dropdown */}
                {showHistory && promptHistory.length > 0 && (
                  <div className="mt-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Recent AI Prompts</span>
                      <button type="button" onClick={handleClearHistory} className="text-[10px] text-red-500 hover:underline flex items-center gap-1">
                        <Trash2 className="w-2.5 h-2.5" /> Clear
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto no-scrollbar">
                      {promptHistory.map((h) => (
                        <button 
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setSearchQuery(h.prompt);
                            setIsAiMode(true);
                            handleSearchSubmit(undefined, h.prompt);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-50 dark:border-gray-700 last:border-0 flex justify-between items-center group"
                        >
                          <span className="truncate flex-1">{h.prompt}</span>
                          <span className="text-[10px] text-gray-400 group-hover:text-indigo-500">{new Date(h.timestamp).toLocaleDateString()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
             </form>
        ) : (
            <div className="flex items-center justify-between mb-4 animate-in fade-in duration-200">
            <div className="flex items-center text-gray-800 dark:text-white">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-full mr-3">
                <MapPin className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Current Location</p>
                <h1 className="text-sm font-bold truncate max-w-[200px]">{locationName}</h1>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setIsSearching(true)} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Search className="w-5 h-5" />
                </button>
            </div>
            </div>
        )}

        {/* Categories */}
        {!aiPlaces.length && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {['all', 'food', 'retail', 'service'].map((cat) => (
                <button
                key={cat}
                onClick={() => setFilter(cat as any)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === cat 
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md' 
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
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
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        AI Recommendations
                    </h2>
                    <button onClick={() => setAiPlaces([])} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                </div>
                <div className="space-y-3">
                    {aiPlaces.map((place, i) => (
                        <a 
                            key={i} 
                            href={place.uri} 
                            target="_blank" 
                            rel="noreferrer"
                            className="block bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 active:scale-[0.98] transition-transform"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{place.title}</h3>
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
                                        <Navigation className="w-3 h-3" />
                                        {place.address}
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
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl h-64 animate-pulse shadow-sm border border-gray-100 dark:border-gray-700" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {!aiPlaces.length && (
                <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nearby Deals</h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">{filteredDeals.length} results</span>
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
