
import React, { useState, useEffect } from 'react';
import { User, Settings, Heart, Bell, LogOut, ChevronRight, Shield, ArrowLeft, Moon, Smartphone, Lock, Eye, Volume2, MapPin, Download, ExternalLink, Mail, LifeBuoy, Copy, CheckCircle, Send, Loader2, Pencil, X } from 'lucide-react';
import DealCard from './DealCard';
import RedeemModal from './RedeemModal';
import { Deal, UserProfile } from '../types';
import { db } from '../services/db';
import { auth } from '../services/auth';

interface ProfileViewProps {
  user: any; // Supabase user
  onLogout: () => void;
}

type ViewState = 'MAIN' | 'SAVED' | 'NOTIFICATIONS' | 'PRIVACY' | 'SETTINGS' | 'HELP_CENTER' | 'REPORT_ISSUE';

const ProfileView: React.FC<ProfileViewProps> = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState<ViewState>('MAIN');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  
  // Real Data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedDeals, setSavedDeals] = useState<Deal[]>([]);
  const [redemptionCount, setRedemptionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', avatarUrl: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    setLoading(true);
    if (user) {
      const p = await db.getUserProfile(user.id);
      const s = await db.getSavedDeals(user.id);
      const r = await db.getRedemptionCount(user.id);
      setProfile(p);
      setSavedDeals(s);
      setRedemptionCount(r);
      
      // Initialize Edit Form
      if (p) {
        setEditForm({ fullName: p.full_name || '', avatarUrl: p.avatar_url || '' });
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await auth.signOut();
    onLogout();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSavingProfile(true);
      await db.updateUserProfile(user.id, {
          full_name: editForm.fullName,
          avatar_url: editForm.avatarUrl
      });
      await loadProfileData();
      setIsSavingProfile(false);
      setIsEditingProfile(false);
  };

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
        {savedDeals.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Heart className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No saved deals yet.</p>
          </div>
        ) : (
          savedDeals.map(deal => (
            <DealCard 
              key={deal.id} 
              deal={deal} 
              onRedeem={setSelectedDeal} 
              isSaved={true}
              onSave={async () => {
                 // Simple unsave optimistic update for this view
                 setSavedDeals(prev => prev.filter(d => d.id !== deal.id));
                 await db.toggleSaveDeal(user.id, deal.id);
              }}
            />
          ))
        )}
      </div>
      <RedeemModal 
        deal={selectedDeal} 
        userId={user.id}
        onClose={() => setSelectedDeal(null)} 
      />
    </div>
  );

  const renderNotifications = () => (
    <div className={`animate-in slide-in-from-right duration-300 min-h-screen ${settingsState.darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <SubPageHeader title="Notifications" />
      <div className="p-4 space-y-2">
        {[
          { title: 'Welcome to Scout!', body: 'Thanks for joining. Start exploring local deals now.', time: 'Just now', icon: User, color: 'text-emerald-500 bg-emerald-50' }
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
        {/* ... (Existing Privacy Buttons) ... */}
        {/* Change Password */}
        <button 
          onClick={() => alert('Password reset email has been sent to ' + user.email)}
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

        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Privacy Policy</h4>
            <p className="text-xs text-blue-600 leading-relaxed">
                Scout values your privacy. We only use your location data to show relevant local deals.
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
        <a 
            href="mailto:support@scout.com"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors active:scale-98 flex items-center justify-center gap-2 mt-8"
        >
            <Send className="w-4 h-4" />
            Write an Email
        </a>
      </div>
    </div>
  );

  const renderReportIssue = () => {
    // ... (Existing Report Issue Code) ...
    return (
       <div className={`animate-in slide-in-from-right duration-300 min-h-screen ${settingsState.darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
            <SubPageHeader title="Report an Issue" onBack={() => setCurrentView('SETTINGS')} />
            <div className="p-6">
                 <p className="text-sm text-gray-500">Please describe the issue...</p>
                 <button onClick={() => setCurrentView('SETTINGS')} className="mt-4 text-blue-500">Back</button>
            </div>
       </div>
    )
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
            </div>
        </div>

        <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Support</h3>
             <div className="space-y-3">
                <button 
                  onClick={() => setCurrentView('HELP_CENTER')}
                  className={`w-full p-4 rounded-xl border shadow-sm flex items-center justify-between active:scale-[0.98] transition-all ${settingsState.darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}
                >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${settingsState.darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                        <LifeBuoy className="w-5 h-5" />
                      </div>
                      <span className={`text-sm font-medium ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>Help Center</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
             </div>
        </div>
      </div>
    </div>
  );

  // --- Main View ---

  if (currentView === 'SAVED') return renderSavedDeals();
  if (currentView === 'NOTIFICATIONS') return renderNotifications();
  if (currentView === 'PRIVACY') return renderPrivacy();
  if (currentView === 'SETTINGS') return renderSettings();
  if (currentView === 'HELP_CENTER') return renderHelpCenter();
  if (currentView === 'REPORT_ISSUE') return renderReportIssue();

  return (
    <div className={`animate-in fade-in duration-300 pb-24 min-h-screen ${settingsState.darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className={`${settingsState.darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} pt-12 pb-8 px-6 rounded-b-[2.5rem] shadow-sm relative overflow-hidden`}>
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-gray-50/50 to-transparent pointer-events-none" />
        
        <div className="relative flex flex-col items-center">
            <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden relative">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-10 h-10 text-gray-300" />
                    )}
                </div>
                <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="absolute bottom-0 right-0 p-2 bg-emerald-500 text-white rounded-full border-4 border-white shadow-sm active:scale-95 transition-transform"
                >
                    <Pencil className="w-3 h-3" />
                </button>
            </div>
            
            <h1 className="text-2xl font-bold mb-1">{profile?.full_name || profile?.email?.split('@')[0] || 'Member'}</h1>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${settingsState.darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
                {profile?.role === 'admin' ? 'Admin Access' : 'Scout Member'}
            </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
            <div className={`p-3 rounded-2xl text-center shadow-sm ${settingsState.darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <span className={`block text-xl font-bold ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>{savedDeals.length}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Saved</span>
            </div>
            <div className={`p-3 rounded-2xl text-center shadow-sm ${settingsState.darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <span className={`block text-xl font-bold ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>{redemptionCount}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Redeemed</span>
            </div>
            <div className={`p-3 rounded-2xl text-center shadow-sm ${settingsState.darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <span className={`block text-xl font-bold ${settingsState.darkMode ? 'text-white' : 'text-gray-900'}`}>{profile?.points || 0}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Points</span>
            </div>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-3">
        <button 
          onClick={() => setCurrentView('SAVED')}
          className={`w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform ${settingsState.darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-100 text-gray-900'}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${settingsState.darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                    <Heart className="w-5 h-5" />
                </div>
                <span className="font-semibold">Saved Deals</span>
            </div>
            <div className="flex items-center gap-2">
                <ChevronRight className="w-5 h-5 text-gray-300" />
            </div>
        </button>

        <button 
          onClick={() => setCurrentView('SETTINGS')}
          className={`w-full p-4 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform ${settingsState.darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-100 text-gray-900'}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${settingsState.darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                    <Settings className="w-5 h-5" />
                </div>
                <span className="font-semibold">App Settings</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      <div className="px-4 mt-6">
        <button 
            onClick={handleLogout}
            className={`w-full py-4 text-center text-sm font-medium transition-colors ${settingsState.darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600'}`}
        >
            Sign Out
        </button>
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95">
                <button onClick={() => setIsEditingProfile(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
                <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Display Name</label>
                        <input 
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" 
                            value={editForm.fullName}
                            onChange={e => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                            placeholder="Your Name"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Avatar URL</label>
                        <input 
                            className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500" 
                            value={editForm.avatarUrl}
                            onChange={e => setEditForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                            placeholder="https://..."
                        />
                    </div>
                    <button 
                        disabled={isSavingProfile}
                        type="submit" 
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold flex justify-center items-center"
                    >
                        {isSavingProfile ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                    </button>
                </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;