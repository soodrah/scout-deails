
import React, { useState } from 'react';
import { User, Settings, Heart, Bell, LogOut, ChevronRight, Shield, ArrowLeft, Moon, Smartphone, Lock, Eye, Volume2, MapPin, Download, ExternalLink, Mail, LifeBuoy, Copy, CheckCircle, Send } from 'lucide-react';
import DealCard from './DealCard';
import RedeemModal from './RedeemModal';
import { Deal } from '../types';

// Mock Data for Saved Deals
const MOCK_SAVED_DEALS: Deal[] = [
  {
    id: 's1',
    businessName: 'Bean Culture Coffee',
    title: 'Buy 1 Get 1 Free Latte',
    description: 'Purchase any large latte and get a second one of equal or lesser value for free. Perfect for a coffee date!',
    discount: 'BOGO',
    category: 'food',
    distance: '0.8 miles',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    code: 'BEAN-BOGO',
    expiry: '2024-12-20'
  },
  {
    id: 's2',
    businessName: 'Urban Outfitters',
    title: '20% Off Denim',
    description: 'Get 20% off all denim jeans and jackets. Refresh your wardrobe for the season.',
    discount: '20% OFF',
    category: 'retail',
    distance: '1.2 miles',
    imageUrl: 'https://images.unsplash.com/photo-1542272617-08f083d032f5?auto=format&fit=crop&w=800&q=80',
    code: 'DENIM20',
    expiry: '2024-12-15'
  },
  {
    id: 's3',
    businessName: 'Glow Spa',
    title: '$15 Off Massage',
    description: 'Relax and unwind with $15 off any 60-minute massage session.',
    discount: '$15 OFF',
    category: 'service',
    distance: '2.5 miles',
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
    code: 'RELAX15',
    expiry: '2024-12-30'
  }
];

type ViewState = 'MAIN' | 'SAVED' | 'NOTIFICATIONS' | 'PRIVACY' | 'SETTINGS' | 'HELP_CENTER' | 'REPORT_ISSUE';

const ProfileView = () => {
  const [currentView, setCurrentView] = useState<ViewState>('MAIN');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Settings State
  const [settingsState, setSettingsState] = useState({
    darkMode: false,
    sound: true,
    haptic: true
  });

  // Privacy State
  const [privacyState, setPrivacyState] = useState({
    faceId: true,
    location: 'While Using'
  });

  // Report Issue Form State
  const [issueForm, setIssueForm] = useState({ subject: '', description: '' });
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueSent, setIssueSent] = useState(false);

  // Helper to render header for sub-pages
  const SubPageHeader = ({ title, onBack }: { title: string, onBack?: () => void }) => (
    <div className={`sticky top-0 z-10 backdrop-blur-md border-b px-4 py-4 flex items-center gap-3 transition-colors duration-300 ${settingsState.darkMode ? 'bg-gray-900/80 border-gray-800 text-white' : 'bg-white/80 border-gray-100 text-gray-900'}`}>
      <button 
        onClick={onBack || (() => setCurrentView('MAIN'))}
        className={`p-2 -ml-2 rounded-full active:scale-95 transition-all ${settingsState.darkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-900'}`}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );

  // --- Sub-Screens ---

  const renderSavedDeals = () => (
    <div className={`animate-in slide-in-from-right duration-300 min-h-screen ${settingsState.darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <SubPageHeader title="Saved Deals" />
      <div className="p-4 space-y-4">
        {MOCK_SAVED_DEALS.map(deal => (
          <DealCard 
            key={deal.id} 
            deal={deal} 
            onRedeem={setSelectedDeal} 
          />
        ))}
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className={`animate-in slide-in-from-right duration-300 min-h-screen ${settingsState.darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <SubPageHeader title="Notifications" />
      <div className="p-4 space-y-2">
        {[
          { title: 'Deal Expiring Soon', body: 'Your saved deal at Bean Culture Coffee expires tomorrow!', time: '2h ago', icon: Bell, color: 'text-orange-500 bg-orange-50' },
          { title: 'New Deal Nearby', body: '25% off at Pasta Paradise just dropped.', time: '5h ago', icon: MapPin, color: 'text-blue-500 bg-blue-50' },
          { title: 'Welcome to Scout!', body: 'Thanks for joining. Start exploring local deals now.', time: '1d ago', icon: User, color: 'text-emerald-500 bg-emerald-50' }
        ].map((notif, i) => (
          <div key={i} className={`p-4 rounded-xl border shadow-sm flex gap-4 ${settingsState.darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
            <div className={`p-3 rounded-full h-fit ${settingsState.darkMode ? 'bg-gray-800' : ''} ${notif.color}`}>
              <notif.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`font-semibold text-sm ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>{notif.title}</h3>
              <p className={`text-xs mt-1 leading-relaxed ${settingsState.darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{notif.body}</p>
              <span className="text-[10px] text-gray-400 mt-2 block">{notif.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className={`animate-in slide-in-from-right duration-300 min-h-screen ${settingsState.darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <SubPageHeader title="Privacy & Security" />
      <div className="p-4 space-y-3">
        
        {/* Change Password */}
        <button 
          onClick={() => alert('Password reset email has been sent to your registered email.')}
          className={`w-full p-4 rounded-xl border shadow-sm flex items-center justify-between active:scale-[0.98] transition-all ${settingsState.darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}
        >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settingsState.darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                <Lock className="w-5 h-5" />
              </div>
              <span className={`text-sm font-medium ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>Change Password</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* Face ID Toggle */}
        <div className={`p-4 rounded-xl border shadow-sm flex items-center justify-between ${settingsState.darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settingsState.darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                <Eye className="w-5 h-5" />
              </div>
              <span className={`text-sm font-medium ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>Face ID / Touch ID</span>
            </div>
            <div 
              onClick={() => setPrivacyState(prev => ({ ...prev, faceId: !prev.faceId }))}
              className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors duration-300 ${privacyState.faceId ? 'bg-emerald-500' : 'bg-gray-300'}`}
            >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${privacyState.faceId ? 'right-1' : 'left-1'}`} />
            </div>
        </div>

        {/* Location Permission */}
        <button 
          onClick={() => {
            const options = ['Always', 'While Using', 'Never'];
            const next = options[(options.indexOf(privacyState.location) + 1) % options.length];
            setPrivacyState(prev => ({ ...prev, location: next }));
          }}
          className={`w-full p-4 rounded-xl border shadow-sm flex items-center justify-between active:scale-[0.98] transition-all ${settingsState.darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}
        >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settingsState.darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                <MapPin className="w-5 h-5" />
              </div>
              <span className={`text-sm font-medium ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>Location Permissions</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">{privacyState.location}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
        </button>

        {/* Data & History */}
        <button 
          onClick={() => alert('Your data archive is being prepared. You will receive a notification when it is ready to download.')}
          className={`w-full p-4 rounded-xl border shadow-sm flex items-center justify-between active:scale-[0.98] transition-all ${settingsState.darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}
        >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settingsState.darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                <Download className="w-5 h-5" />
              </div>
              <span className={`text-sm font-medium ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>Export Data</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Privacy Policy</h4>
            <p className="text-xs text-blue-600 leading-relaxed">
                Scout values your privacy. We only use your location data to show relevant local deals. We do not sell your personal information to third parties.
            </p>
        </div>
      </div>
    </div>
  );

  const renderHelpCenter = () => (
    <div className={`animate-in slide-in-from-right duration-300 min-h-screen ${settingsState.darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <SubPageHeader title="Help Center" onBack={() => setCurrentView('SETTINGS')} />
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className={`p-6 rounded-full mb-6 ${settingsState.darkMode ? 'bg-gray-800' : 'bg-blue-50'}`}>
            <LifeBuoy className={`w-12 h-12 ${settingsState.darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>
        
        <h3 className={`text-xl font-bold mb-2 ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>
            We're here to help
        </h3>
        <p className={`text-sm mb-8 max-w-[280px] leading-relaxed ${settingsState.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Have questions about a deal or experiencing technical issues? Our support team is ready to assist you.
        </p>

        <div className={`w-full p-4 rounded-2xl border flex items-center justify-between mb-4 ${settingsState.darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${settingsState.darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    <Mail className="w-5 h-5" />
                </div>
                <div className="text-left">
                    <p className={`text-xs font-semibold uppercase ${settingsState.darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Email Support</p>
                    <p className={`font-medium ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>support@scout.com</p>
                </div>
            </div>
            <button 
                onClick={() => {
                    navigator.clipboard.writeText('support@scout.com');
                    alert('Email copied to clipboard!');
                }}
                className={`p-2 rounded-lg transition-colors ${settingsState.darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-50 text-gray-500'}`}
            >
                <Copy className="w-4 h-4" />
            </button>
        </div>

        <a 
            href="mailto:support@scout.com"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors active:scale-98 flex items-center justify-center gap-2"
        >
            <Send className="w-4 h-4" />
            Write an Email
        </a>
      </div>
    </div>
  );

  const renderReportIssue = () => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingIssue(true);
        
        // Simulate API call
        setTimeout(() => {
            setIsSubmittingIssue(false);
            setIssueSent(true);
            // Reset after 3 seconds and go back
            setTimeout(() => {
                setIssueSent(false);
                setIssueForm({ subject: '', description: '' });
                setCurrentView('SETTINGS');
            }, 2500);
        }, 1500);
    };

    if (issueSent) {
        return (
            <div className={`animate-in slide-in-from-right duration-300 min-h-screen flex flex-col items-center justify-center p-6 text-center ${settingsState.darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className={`text-2xl font-bold mb-2 ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>Request Sent!</h3>
                <p className={`text-gray-500 mb-8 max-w-xs ${settingsState.darkMode ? 'text-gray-400' : ''}`}>
                    We've received your issue report. A support ticket has been created and sent to <span className="font-semibold">support@scout.com</span>.
                </p>
                <button 
                    onClick={() => setCurrentView('SETTINGS')}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                >
                    Return to Settings
                </button>
            </div>
        );
    }

    return (
        <div className={`animate-in slide-in-from-right duration-300 min-h-screen ${settingsState.darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
            <SubPageHeader title="Report an Issue" onBack={() => setCurrentView('SETTINGS')} />
            <div className="p-6">
                <p className={`text-sm mb-6 ${settingsState.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Please describe the issue you encountered. Our team will review your report and get back to you at support@scout.com.
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ml-1 ${settingsState.darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Subject
                        </label>
                        <input 
                            type="text" 
                            required
                            value={issueForm.subject}
                            onChange={e => setIssueForm({...issueForm, subject: e.target.value})}
                            placeholder="e.g., App crashes on redeem screen"
                            className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${settingsState.darkMode ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                        />
                    </div>
                    
                    <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ml-1 ${settingsState.darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            Description
                        </label>
                        <textarea 
                            required
                            rows={6}
                            value={issueForm.description}
                            onChange={e => setIssueForm({...issueForm, description: e.target.value})}
                            placeholder="Please provide as much detail as possible..."
                            className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none ${settingsState.darkMode ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-600' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`}
                        />
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit"
                            disabled={isSubmittingIssue}
                            className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmittingIssue ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Submit Report</span>
                                    <Send className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
  };

  const renderSettings = () => (
    <div className={`animate-in slide-in-from-right duration-300 min-h-screen ${settingsState.darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <SubPageHeader title="App Settings" onBack={() => setCurrentView('MAIN')} />
      <div className="p-4 space-y-6">
        <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">General</h3>
            <div className="space-y-3">
                {/* Dark Mode */}
                <div className={`p-4 rounded-xl border shadow-sm flex items-center justify-between ${settingsState.darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settingsState.darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                            <Moon className="w-5 h-5" />
                        </div>
                        <span className={`text-sm font-medium ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>Dark Mode</span>
                    </div>
                    <div 
                        onClick={() => setSettingsState(prev => ({ ...prev, darkMode: !prev.darkMode }))}
                        className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors duration-300 ${settingsState.darkMode ? 'bg-indigo-500' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${settingsState.darkMode ? 'right-1' : 'left-1'}`} />
                    </div>
                </div>

                {/* Sound Effects */}
                <div className={`p-4 rounded-xl border shadow-sm flex items-center justify-between ${settingsState.darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settingsState.darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                            <Volume2 className="w-5 h-5" />
                        </div>
                        <span className={`text-sm font-medium ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>Sound Effects</span>
                    </div>
                    <div 
                        onClick={() => setSettingsState(prev => ({ ...prev, sound: !prev.sound }))}
                        className={`w-12 h-7 rounded-full relative cursor-pointer transition-colors duration-300 ${settingsState.sound ? 'bg-emerald-500' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${settingsState.sound ? 'right-1' : 'left-1'}`} />
                    </div>
                </div>

                {/* Haptic Feedback */}
                <div className={`p-4 rounded-xl border shadow-sm flex items-center justify-between ${settingsState.darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settingsState.darkMode ? 'bg-gray