import React from 'react';
import { X, QrCode, Timer, Copy } from 'lucide-react';
import { Deal } from '../types';

interface RedeemModalProps {
  deal: Deal | null;
  onClose: () => void;
}

const RedeemModal: React.FC<RedeemModalProps> = ({ deal, onClose }) => {
  if (!deal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Pattern */}
        <div className="h-32 bg-gray-900 relative p-6 text-white flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <QrCode size={120} />
            </div>
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
            <div className="z-10 mt-auto">
                <h3 className="text-xl font-bold">{deal.businessName}</h3>
                <p className="text-gray-300 text-sm">{deal.title}</p>
            </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center">
            
            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-300 mb-6">
                <QrCode className="w-48 h-48 text-gray-900" />
            </div>

            <p className="text-gray-500 text-sm mb-2">Show this code at checkout</p>
            
            <div className="flex items-center gap-2 bg-gray-100 px-6 py-3 rounded-lg w-full justify-center mb-6 cursor-pointer active:scale-95 transition-transform hover:bg-gray-200" onClick={() => navigator.clipboard.writeText(deal.code)}>
                <span className="text-2xl font-mono font-bold tracking-wider text-gray-900">{deal.code}</span>
                <Copy className="w-4 h-4 text-gray-400" />
            </div>

            <div className="flex items-center justify-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-full text-xs font-medium">
                <Timer className="w-4 h-4" />
                <span>Expires in 14:59</span>
            </div>

            <button 
                onClick={onClose}
                className="mt-8 w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-transform"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default RedeemModal;