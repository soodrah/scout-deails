
import React, { useState, useEffect } from 'react';
import { MapPin, Search, Filter, RefreshCw, Loader2, X } from 'lucide-react';
import { Deal } from '../types';
import DealCard from './DealCard';
import RedeemModal from './RedeemModal';
import { db } from '../services/db';

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

  const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (onSearch && searchQuery.trim()) {
          onSearch(searchQuery);
          setIsSearching(false);
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
             <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 mb-4 animate-in fade-in duration-200">
                <div className="flex-1 relative">
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="Enter city (e.g. Mumbai)" 
                        className="w-full bg-gray-100 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                </div>
                <button type="button" onClick={() => setIsSearching(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                </button>
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

        {/* Categories */}
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
      </div>

      {/* Content */}
      <div className="px-4 py-6">
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
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-gray-900">Nearby Deals</h2>
              <span className="text-xs text-gray-500">{filteredDeals.length} results</span>
            </div>
            
            {filteredDeals.map(deal => (
              <DealCard 
                key={deal.id} 
                deal={deal} 
                onRedeem={setSelectedDeal}
                onSave={userId ? handleSave : undefined}
                isSaved={savedDealIds.has(deal.id)}
              />
            ))}

            {filteredDeals.length === 0 && (
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
