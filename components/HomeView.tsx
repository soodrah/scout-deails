import React from 'react';
import { MapPin, ShoppingBag, Sparkles, ChevronRight } from 'lucide-react';

interface HomeViewProps {
  onGetStarted: () => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onGetStarted }) => {
  return (
    <div className="h-full flex flex-col items-center justify-between bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-emerald-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-8 relative z-10">
        
        {/* Logo Container */}
        <div className="mb-10 relative">
          <div className="w-24 h-24 bg-gray-900 rounded-[2rem] flex items-center justify-center shadow-2xl rotate-3">
            <div className="text-white relative">
                <MapPin className="w-10 h-10 absolute -top-1 -right-1 text-emerald-400" />
                <span className="text-5xl font-black tracking-tighter">L</span>
            </div>
          </div>
          <div className="w-24 h-24 bg-emerald-500/20 rounded-[2rem] absolute top-2 left-2 -z-10 rotate-6" />
        </div>

        {/* Text */}
        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight text-center">
          Lokal
        </h1>
        <p className="text-lg text-gray-500 text-center font-medium mb-8 max-w-[200px] leading-relaxed">
          Discover your neighborhood's best kept secrets.
        </p>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-12">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                <div className="bg-white p-2 rounded-xl shadow-sm mb-2">
                    <ShoppingBag className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-xs font-bold text-gray-900">Exclusive Deals</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                <div className="bg-white p-2 rounded-xl shadow-sm mb-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-xs font-bold text-gray-900">Local Gems</span>
            </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="w-full p-8 pb-12 bg-white/80 backdrop-blur-md border-t border-gray-100 z-20">
        <button 
          onClick={onGetStarted}
          className="w-full bg-gray-900 text-white text-lg font-bold py-4 rounded-2xl shadow-lg shadow-gray-200 active:scale-95 transition-all flex items-center justify-center gap-2 group"
        >
          Get Started
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
        <p className="text-center text-xs text-gray-400 mt-4">
            By continuing, you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default HomeView;