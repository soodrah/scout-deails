import React, { useState } from 'react';
import { MapPin, Search, Filter } from 'lucide-react';
import { Deal } from '../types';
import DealCard from './DealCard';
import RedeemModal from './RedeemModal';

interface ConsumerViewProps {
  deals: Deal[];
  loading: boolean;
  locationName: string;
}

const ConsumerView: React.FC<ConsumerViewProps> = ({ deals, loading, locationName }) => {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [filter, setFilter] = useState<'all' | 'food' | 'retail' | 'service'>('all');

  const filteredDeals = filter === 'all' 
    ? deals 
    : deals.filter(d => d.category === filter);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-gray-800">
            <div className="bg-emerald-100 p-2 rounded-full mr-3">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Current Location</p>
              <h1 className="text-sm font-bold truncate max-w-[200px]">{locationName}</h1>
            </div>
          </div>
          <button className="p-2 bg-gray-50 rounded-full text-gray-600 hover:bg-gray-100">
            <Search className="w-5 h-5" />
          </button>
        </div>

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
        {loading ? (
          <div className="space-y-4">
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
        onClose={() => setSelectedDeal(null)} 
      />
    </div>
  );
};

export default ConsumerView;