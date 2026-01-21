
import React, { useState, useEffect } from 'react';
import { Briefcase, Mail, RefreshCw, Sparkles, ExternalLink, Plus, Store, Tag, X, ChevronRight, Loader2, Edit2, Trash2, Power, ChevronDown, ChevronUp, Image as ImageIcon, Stethoscope, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { BusinessLead, UserLocation, Business, Deal, PromptHistory } from '../types';
import { fetchBusinessLeads, generateOutreachEmail, generateDealContent, analyzeDeal, generateSmartBusinessImage } from '../services/geminiService';
import { db } from '../services/db';

interface AdminViewProps {
  location: UserLocation;
}

const AdminView: React.FC<AdminViewProps> = ({ location }) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'outreach' | 'history'>('manage');
  
  // Manage Tab State
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(false);
  const [expandedBizId, setExpandedBizId] = useState<string | null>(null);
  const [expandedBizDeals, setExpandedBizDeals] = useState<Deal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);

  // Modals & Forms State
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  const [showAddDeal, setShowAddDeal] = useState<string | null>(null); 
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI State
  const [isGeneratingDeal, setIsGeneratingDeal] = useState(false);
  const [analyzingDealId, setAnalyzingDealId] = useState<string | null>(null);
  const [aiHistory, setAiHistory] = useState<PromptHistory[]>([]);
  
  // Forms
  const [bizForm, setBizForm] = useState({ name: '', type: '', address: '', website: '', imageUrl: '', category: 'food' });
  const [dealForm, setDealForm] = useState({ title: '', description: '', discount: '', code: '', expiry: '' });

  // Outreach Tab State
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ id: string; text: string; sources: any[] } | null>(null);

  useEffect(() => {
    refreshDbData();
    loadAiHistory();
  }, []);

  const loadAiHistory = async () => {
    const history = await db.getPromptHistory();
    setAiHistory(history);
  };

  const refreshDbData = async () => {
    setLoadingBiz(true);
    const data = await db.getBusinesses();
    setBusinesses(data);
    setLoadingBiz(false);
  };

  const fetchBizDeals = async (bizId: string) => {
    setLoadingDeals(true);
    const deals = await db.getDealsByBusiness(bizId);
    setExpandedBizDeals(deals);
    setLoadingDeals(false);
  };

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let website = bizForm.website.trim();
    if (website && !/^https?:\/\//i.test(website)) {
      website = `https://${website}`;
    }

    let finalImageUrl = bizForm.imageUrl;
    if (!finalImageUrl && bizForm.name && bizForm.type) {
        finalImageUrl = await generateSmartBusinessImage(bizForm.name, bizForm.type);
    }

    const payload = {
      name: bizForm.name,
      type: bizForm.type,
      category: bizForm.category as any,
      address: bizForm.address,
      website: website,
      imageUrl: finalImageUrl,
      city: location.city || 'San Francisco'
    };

    if (editingBiz) {
        await db.updateBusiness(editingBiz.id, payload);
    } else {
        await db.addBusiness(payload);
    }

    setBizForm({ name: '', type: '', address: '', website: '', imageUrl: '', category: 'food' });
    setShowAddBusiness(false);
    setEditingBiz(null);
    setIsSubmitting(false);
    refreshDbData();
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (editingDeal) {
        await db.updateDeal(editingDeal.id, dealForm);
        fetchBizDeals(editingDeal.business_id);
    } else if (showAddDeal) {
        const biz = businesses.find(b => b.id === showAddDeal);
        if (biz) {
            await db.addDeal({
                business_id: biz.id,
                businessName: biz.name,
                category: biz.category,
                title: dealForm.title,
                description: dealForm.description,
                discount: dealForm.discount,
                code: dealForm.code,
                distance: '0.1 miles',
                expiry: dealForm.expiry || '2025-12-31',
                imageUrl: '',
                website: biz.website
            });
            fetchBizDeals(biz.id);
        }
    }

    setDealForm({ title: '', description: '', discount: '', code: '', expiry: '' });
    setShowAddDeal(null);
    setEditingDeal(null);
    setIsSubmitting(false);
    refreshDbData();
  };

  const handleAutoFill = async () => {
      const bizId = showAddDeal;
      const biz = businesses.find(b => b.id === bizId);
      if (!biz) return;

      setIsGeneratingDeal(true);
      const content = await generateDealContent(biz.name, biz.type);
      if (content) {
          // Save to History
          await db.savePrompt({
            type: 'deal_gen',
            prompt: `Generate deal for ${biz.name}`,
            resultSummary: content.title,
            metadata: { businessId: biz.id, content }
          });
          loadAiHistory();

          setDealForm(prev => ({
              ...prev,
              title: content.title || '',
              description: content.description || '',
              discount: content.discount || '',
              code: content.code || ''
          }));
      }
      setIsGeneratingDeal(false);
  };

  const handleDraftEmail = async (lead: BusinessLead) => {
    setGeneratingEmail(lead.id);
    setEmailDraft(null);
    try {
      const { text, sources } = await generateOutreachEmail(lead.name, lead.type);
      
      // Save to History
      await db.savePrompt({
        type: 'email_gen',
        prompt: `Email for ${lead.name}`,
        resultSummary: text.substring(0, 50) + '...',
        metadata: { leadId: lead.id, text }
      });
      loadAiHistory();

      setEmailDraft({ id: lead.id, text, sources });
    } catch (error: any) {
      alert("Failed to generate email.");
    } finally {
      setGeneratingEmail(null);
    }
  };
  
  const handleLogOutreach = async (leadId: string) => {
      if (!emailDraft) return;
      await db.updateBusinessLead(leadId, {
          contactStatus: 'contacted',
          lastOutreachContent: emailDraft.text,
          lastOutreachDate: new Date().toISOString()
      });
      
      const cleanBody = emailDraft.text.replace(/\*\*/g, '').replace(/\*/g, '-');
      const subject = encodeURIComponent("Partnership Opportunity with Lokal");
      const body = encodeURIComponent(cleanBody).replace(/%0A/g, '%0D%0A');
      
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      setEmailDraft(null);
      refreshDbData();
  };

  return (
    <div className="pb-24">
      {/* Admin Header */}
      <div className="bg-gray-900 dark:bg-black text-white px-6 py-8 rounded-b-[2.5rem] shadow-xl mb-6 relative overflow-hidden transition-all duration-300">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-1">Owner Dashboard</h1>
          <p className="text-gray-400 text-xs">Manage portfolio and AI activity</p>
          <div className="flex p-1 bg-gray-800 rounded-xl mt-6">
            {['manage', 'outreach', 'history'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)} 
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all capitalize ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MANAGE TAB */}
      {activeTab === 'manage' && (
        <div className="px-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800 dark:text-white">My Businesses</h2>
            <button onClick={() => { setEditingBiz(null); setShowAddBusiness(true); }} className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 active:scale-95 transition-transform">
              <Plus className="w-3 h-3" /> Add Business
            </button>
          </div>

          {loadingBiz ? (
             <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : (
            <div className="space-y-4">
                {businesses.map(biz => (
                <div key={biz.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border transition-all ${biz.is_active === false ? 'opacity-75 bg-gray-50 dark:bg-gray-900' : 'border-gray-100 dark:border-gray-700'}`}>
                    <div onClick={() => { setExpandedBizId(expandedBizId === biz.id ? null : biz.id); if (expandedBizId !== biz.id) fetchBizDeals(biz.id); }} className="p-4 flex items-start gap-3 cursor-pointer">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-gray-700">
                            {biz.imageUrl ? <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" /> : <Store className="w-6 h-6 text-gray-600 dark:text-gray-300" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h3 className={`font-bold ${biz.is_active === false ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{biz.name}</h3>
                                {expandedBizId === biz.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{biz.type} • {biz.city}</p>
                        </div>
                    </div>
                    {expandedBizId === biz.id && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-b-xl border-t border-gray-100 dark:border-gray-700">
                             <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase">Active Deals</h4>
                                <button onClick={() => setShowAddDeal(biz.id)} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md text-xs font-semibold">+ Add Deal</button>
                             </div>
                             {loadingDeals ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (
                                 <div className="space-y-2">
                                     {expandedBizDeals.map(deal => (
                                         <div key={deal.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700 flex justify-between items-center">
                                             <div><p className="text-sm font-semibold dark:text-white">{deal.title}</p><p className="text-xs text-gray-500">{deal.discount}</p></div>
                                             <div className="flex gap-1">
                                                <button onClick={() => { setEditingDeal(deal); setShowAddDeal(deal.business_id); }} className="p-1.5 text-gray-400 hover:text-gray-700"><Edit2 className="w-3 h-3" /></button>
                                                <button onClick={async () => { await db.deleteDeal(deal.id); fetchBizDeals(biz.id); }} className="p-1.5 text-red-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                        </div>
                    )}
                </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="px-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800 dark:text-white">AI Activity Log</h2>
            <button onClick={async () => { await db.clearPromptHistory(); loadAiHistory(); }} className="text-xs text-red-500 hover:underline">Clear History</button>
          </div>
          <div className="space-y-3">
            {aiHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No prompt history found.</p>
              </div>
            ) : (
              aiHistory.map(h => (
                <div key={h.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${h.type === 'search' ? 'bg-indigo-50 text-indigo-600' : h.type === 'deal_gen' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                      {h.type.replace('_', ' ')}
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(h.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">"{h.prompt}"</p>
                  {h.resultSummary && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700 text-xs text-gray-500">
                      {h.resultSummary}
                    </div>
                  )}
                  {h.type === 'deal_gen' && h.metadata?.content && (
                    <button 
                      onClick={() => {
                        setDealForm({
                          title: h.metadata.content.title,
                          description: h.metadata.content.description,
                          discount: h.metadata.content.discount,
                          code: h.metadata.content.code,
                          expiry: ''
                        });
                        setShowAddDeal(h.metadata.businessId);
                      }}
                      className="mt-3 text-[10px] font-bold text-indigo-500 flex items-center gap-1 hover:underline"
                    >
                      Restore to Editor <Plus className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* OUTREACH TAB (Simplified) */}
      {activeTab === 'outreach' && (
        <div className="px-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h2 className="font-bold text-gray-800 dark:text-white mb-4">Marketing Outreach</h2>
          {/* Email Draft Section */}
          {emailDraft ? (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm animate-in zoom-in-95">
              <h3 className="font-bold mb-2 dark:text-white">Email Draft</h3>
              <textarea 
                className="w-full text-xs p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700 h-48 mb-4 outline-none" 
                value={emailDraft.text}
                onChange={e => setEmailDraft({...emailDraft, text: e.target.value})}
              />
              <button onClick={() => handleLogOutreach(emailDraft.id)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Send & Log</button>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <Mail className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Select a lead from history or manage to start outreach.</p>
              <button onClick={() => setActiveTab('history')} className="mt-4 text-indigo-500 font-bold">Check AI History</button>
            </div>
          )}
        </div>
      )}

      {/* MODALS (Reusable logic) */}
      {showAddBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95">
            <button onClick={() => setShowAddBusiness(false)} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X className="w-4 h-4 dark:text-white" /></button>
            <h2 className="text-xl font-bold mb-4 dark:text-white">{editingBiz ? 'Edit' : 'Add'} Business</h2>
            <form onSubmit={handleSaveBusiness} className="space-y-3">
              <input required placeholder="Name" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={bizForm.name} onChange={e => setBizForm({...bizForm, name: e.target.value})} />
              <input required placeholder="Type" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={bizForm.type} onChange={e => setBizForm({...bizForm, type: e.target.value})} />
              <input required placeholder="Address" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={bizForm.address} onChange={e => setBizForm({...bizForm, address: e.target.value})} />
              <button disabled={isSubmitting} type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl font-bold">{isSubmitting ? <Loader2 className="animate-spin" /> : 'Save'}</button>
            </form>
          </div>
        </div>
      )}

      {showAddDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95">
            <button onClick={() => setShowAddDeal(null)} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X className="w-4 h-4 dark:text-white" /></button>
            <h2 className="text-xl font-bold mb-4 dark:text-white">{editingDeal ? 'Edit' : 'Create'} Deal</h2>
            {!editingDeal && <button onClick={handleAutoFill} disabled={isGeneratingDeal} className="w-full mb-4 bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2">{isGeneratingDeal ? <Loader2 className="animate-spin" /> : <Sparkles className="w-4 h-4" />} Auto-Fill AI</button>}
            <form onSubmit={handleSaveDeal} className="space-y-3">
              <input required placeholder="Title" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={dealForm.title} onChange={e => setDealForm({...dealForm, title: e.target.value})} />
              <textarea placeholder="Description" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={dealForm.description} onChange={e => setDealForm({...dealForm, description: e.target.value})} />
              <div className="flex gap-2">
                <input placeholder="Discount" className="w-1/2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={dealForm.discount} onChange={e => setDealForm({...dealForm, discount: e.target.value})} />
                <input placeholder="Code" className="w-1/2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={dealForm.code} onChange={e => setDealForm({...dealForm, code: e.target.value})} />
              </div>
              <button disabled={isSubmitting} type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">Publish</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
