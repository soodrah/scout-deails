
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
      case 'food': return 'bg-orange-100 text-orange-800';
      case 'retail': return 'bg-blue-100 text-blue-800';
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4 flex flex-col relative group">
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
            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur shadow-sm active:scale-95 transition-all hover:bg-white"
          >
            <Heart 
              className={`w-5 h-5 transition-colors ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
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
            <h3 className="text-lg font-bold text-gray-900 leading-tight">{deal.businessName}</h3>
            <p className="text-sm text-gray-500 flex items-center mt-1">
              <MapPin className="w-3 h-3 mr-1" />
              Local Business
            </p>
          </div>
          <div className="text-right">
            <span className="block text-2xl font-bold text-emerald-600">{deal.discount}</span>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {deal.description}
        </p>

        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center text-xs text-gray-500 flex-1">
            <Clock className="w-3 h-3 mr-1" />
            Exp: {deal.expiry}
          </div>
          
          <div className="flex items-center gap-2">
            {deal.website && (
              <a 
                href={deal.website}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 active:scale-95 transition-transform"
                title="Visit Website"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="w-4 h-4" />
              </a>
            )}
            <button 
              onClick={() => onRedeem(deal)}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-semibold active:scale-95 transition-transform shadow-md shadow-gray-200"
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
