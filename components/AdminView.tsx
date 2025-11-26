
import React, { useState, useEffect } from 'react';
import { Briefcase, Mail, RefreshCw, Sparkles, ExternalLink, Plus, Store, Tag, X, ChevronRight, Loader2 } from 'lucide-react';
import { BusinessLead, UserLocation, Business, Deal } from '../types';
import { fetchBusinessLeads, generateOutreachEmail } from '../services/geminiService';
import { db } from '../services/db';

interface AdminViewProps {
  location: UserLocation;
}

const AdminView: React.FC<AdminViewProps> = ({ location }) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'outreach'>('manage');
  
  // Manage Tab State
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(false);
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [showAddDeal, setShowAddDeal] = useState<string | null>(null); // holds business ID
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Forms
  const [newBiz, setNewBiz] = useState({ name: '', type: '', address: '', website: '', category: 'food' });
  const [newDeal, setNewDeal] = useState({ title: '', description: '', discount: '', code: '' });

  // Outreach Tab State
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ id: string; text: string; sources: any[] } | null>(null);

  useEffect(() => {
    // Load DB data
    refreshDbData();
  }, []);

  useEffect(() => {
    // Load AI leads if tab changes
    if (activeTab === 'outreach' && leads.length === 0) {
      loadLeads();
    }
  }, [activeTab]);

  const refreshDbData = async () => {
    setLoadingBiz(true);
    const data = await db.getBusinesses();
    setBusinesses(data);
    setLoadingBiz(false);
  };

  // --- Database Actions ---
  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await db.addBusiness({
      name: newBiz.name,
      type: newBiz.type,
      category: newBiz.category as any,
      address: newBiz.address,
      city: location.city || 'San Francisco',
      website: newBiz.website
    });
    setNewBiz({ name: '', type: '', address: '', website: '', category: 'food' });
    setShowAddBusiness(false);
    setIsSubmitting(false);
    refreshDbData();
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddDeal) return;
    
    const biz = businesses.find(b => b.id === showAddDeal);
    if (!biz) return;

    setIsSubmitting(true);
    await db.addDeal({
      business_id: biz.id,
      businessName: biz.name,
      category: biz.category,
      title: newDeal.title,
      description: newDeal.description,
      discount: newDeal.discount,
      code: newDeal.code,
      distance: '0.1 miles', // Mock distance for created deals
      expiry: '2025-01-01',
      imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&w=800&q=80',
      website: biz.website
    });

    setNewDeal({ title: '', description: '', discount: '', code: '' });
    setShowAddDeal(null);
    setIsSubmitting(false);
    alert('Deal Created!');
  };

  // --- Outreach Actions ---
  const loadLeads = async () => {
    setLoadingLeads(true);
    const data = await fetchBusinessLeads(location.lat, location.lng, location.city);
    setLeads(data);
    setLoadingLeads(false);
  };

  const handleDraftEmail = async (lead: BusinessLead) => {
    setGeneratingEmail(lead.id);
    setEmailDraft(null);
    try {
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) await (window as any).aistudio.openSelectKey();
      }
      const { text, sources } = await generateOutreachEmail(lead.name, lead.type);
      setEmailDraft({ id: lead.id, text, sources });
    } catch (error: any) {
      console.error("Outreach Error:", error);
      const isPermissionError = error.message?.includes('403') || JSON.stringify(error).includes("PERMISSION_DENIED");
      if (isPermissionError && (window as any).aistudio) {
        try { await (window as any).aistudio.openSelectKey(); alert("Key selected! Try again."); } catch (e) {}
      } else {
        alert("Failed to generate email.");
      }
    } finally {
      setGeneratingEmail(null);
    }
  };

  return (
    <div className="pb-24">
      {/* Admin Header */}
      <div className="bg-gray-900 text-white px-6 py-8 rounded-b-[2.5rem] shadow-xl mb-6 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-1">Owner Dashboard</h1>
          <p className="text-gray-400 text-xs">Manage your portfolio and grow your network</p>
          
          {/* Tab Switcher */}
          <div className="flex p-1 bg-gray-800 rounded-xl mt-6">
            <button 
              onClick={() => setActiveTab('manage')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'manage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              Manage
            </button>
            <button 
              onClick={() => setActiveTab('outreach')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'outreach' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'}`}
            >
              Outreach
            </button>
          </div>
        </div>
      </div>

      {/* MANAGE TAB */}
      {activeTab === 'manage' && (
        <div className="px-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800">My Businesses</h2>
            <button 
              onClick={() => setShowAddBusiness(true)}
              className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 active:scale-95 transition-transform"
            >
              <Plus className="w-3 h-3" /> Add Business
            </button>
          </div>

          {loadingBiz ? (
             <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : (
            <div className="space-y-4">
                {businesses.map(biz => (
                <div key={biz.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Store className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                        <h3 className="font-bold text-gray-900">{biz.name}</h3>
                        <p className="text-xs text-gray-500">{biz.type} • {biz.city}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowAddDeal(biz.id)}
                        className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                    >
                        + New Deal
                    </button>
                    </div>
                    
                    {/* Active Deals Count (Mock) */}
                    <div className="flex gap-2 mt-2">
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-md">Status: Active</span>
                    <a href={biz.website} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md flex items-center gap-1">
                        Website <ExternalLink className="w-3 h-3" />
                    </a>
                    </div>
                </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* OUTREACH TAB */}
      {activeTab === 'outreach' && (
        <div className="px-4 animate-in fade-in slide-in-from-right-4 duration-300">
           <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800">AI Lead Finder</h2>
            <button onClick={loadLeads} disabled={loadingLeads} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
               <RefreshCw className={`w-4 h-4 ${loadingLeads ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingLeads ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {leads.map((lead) => (
                <div key={lead.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{lead.name}</h3>
                      <p className="text-xs text-gray-500 mb-1">{lead.type} • {lead.location}</p>
                    </div>
                    <button
                      onClick={() => handleDraftEmail(lead)}
                      disabled={generatingEmail === lead.id}
                      className="flex items-center gap-1 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      {generatingEmail === lead.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      Draft
                    </button>
                  </div>
                  {/* Email Draft Section (Same as before) */}
                  {emailDraft && emailDraft.id === lead.id && (
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                      <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-700 font-mono mb-2">{emailDraft.text}</div>
                      <button className="w-full bg-emerald-500 text-white py-2 rounded-lg text-sm font-bold">Send</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD BUSINESS */}
      {showAddBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95">
            <button onClick={() => setShowAddBusiness(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
            <h2 className="text-xl font-bold mb-4">Add Business</h2>
            <form onSubmit={handleCreateBusiness} className="space-y-3">
              <input required placeholder="Business Name" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={newBiz.name} onChange={e => setNewBiz({...newBiz, name: e.target.value})} />
              <input required placeholder="Type (e.g. Pizza Place)" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={newBiz.type} onChange={e => setNewBiz({...newBiz, type: e.target.value})} />
              <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={newBiz.category} onChange={e => setNewBiz({...newBiz, category: e.target.value})}>
                <option value="food">Food</option>
                <option value="retail">Retail</option>
                <option value="service">Service</option>
              </select>
              <input required placeholder="Address" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={newBiz.address} onChange={e => setNewBiz({...newBiz, address: e.target.value})} />
              <input required placeholder="Website URL" type="url" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={newBiz.website} onChange={e => setNewBiz({...newBiz, website: e.target.value})} />
              <button disabled={isSubmitting} type="submit" className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold flex justify-center">
                 {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create Business'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DEAL */}
      {showAddDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95">
            <button onClick={() => setShowAddDeal(null)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
            <h2 className="text-xl font-bold mb-4">Create New Deal</h2>
            <form onSubmit={handleCreateDeal} className="space-y-3">
              <input required placeholder="Deal Title (e.g. 50% Off)" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={newDeal.title} onChange={e => setNewDeal({...newDeal, title: e.target.value})} />
              <textarea required placeholder="Description" rows={2} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={newDeal.description} onChange={e => setNewDeal({...newDeal, description: e.target.value})} />
              <div className="flex gap-2">
                <input required placeholder="Discount (e.g. $10)" className="w-1/2 p-3 bg-gray-50 rounded-xl border border-gray-200" value={newDeal.discount} onChange={e => setNewDeal({...newDeal, discount: e.target.value})} />
                <input required placeholder="Code (e.g. SAVE10)" className="w-1/2 p-3 bg-gray-50 rounded-xl border border-gray-200" value={newDeal.code} onChange={e => setNewDeal({...newDeal, code: e.target.value})} />
              </div>
              <button disabled={isSubmitting} type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex justify-center">
                 {isSubmitting ? <Loader2 className="animate-spin" /> : 'Publish Deal'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
