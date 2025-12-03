
import React from 'react';
import { MapPin, Clock, Tag, Globe, ExternalLink, Heart } from 'lucide-react';
import { Deal } from '../types';

interface DealCardProps {
  deal: Deal;
  onRedeem: (deal: Deal) => void;
  onSave?: (deal: Deal) => void;
  isSaved?: boolean;
}

const DealCard: React.FC<DealCardProps> = ({ deal, onRedeem, onSave, isSaved }) => {
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'food': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'retail': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-4 flex flex-col relative group transition-colors duration-300">
      <div className="relative h-48 w-full">
        <img 
          src={deal.imageUrl} 
          alt={deal.businessName} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getCategoryColor(deal.category)}`}>
            {deal.category}
          </span>
        </div>
        
        {/* Save Button */}
        {onSave && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onSave(deal);
            }}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur shadow-sm active:scale-95 transition-all hover:bg-white dark:bg-gray-900/80 dark:hover:bg-gray-900"
          >
            <Heart 
              className={`w-5 h-5 transition-colors ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600 dark:text-gray-300'}`} 
            />
          </button>
        )}

        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-lg shadow-sm">
          <span className="text-sm font-bold text-gray-900">{deal.distance} away</span>
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{deal.businessName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
              <MapPin className="w-3 h-3 mr-1" />
              Local Business
            </p>
          </div>
          <div className="text-right">
            <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">{deal.discount}</span>
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
          {deal.description}
        </p>

        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 flex-1">
            <Clock className="w-3 h-3 mr-1" />
            Exp: {deal.expiry}
          </div>
          
          <div className="flex items-center gap-2">
            {deal.website && (
              <a 
                href={deal.website}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-95 transition-transform"
                title="Visit Website"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="w-4 h-4" />
              </a>
            )}
            <button 
              onClick={() => onRedeem(deal)}
              className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold active:scale-95 transition-transform shadow-md shadow-gray-200 dark:shadow-none"
            >
              Redeem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealCard;
