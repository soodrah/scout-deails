
import React, { useState, useEffect } from 'react';
import { Briefcase, Mail, RefreshCw, Sparkles, ExternalLink, Plus, Store, Tag, X, ChevronRight, Loader2, Edit2, Trash2, Power, ChevronDown, ChevronUp, Image as ImageIcon, Stethoscope, MessageSquare } from 'lucide-react';
import { BusinessLead, UserLocation, Business, Deal } from '../types';
import { fetchBusinessLeads, generateOutreachEmail, generateDealContent, analyzeDeal, generateSmartBusinessImage } from '../services/geminiService';
import { db } from '../services/db';

interface AdminViewProps {
  location: UserLocation;
}

const AdminView: React.FC<AdminViewProps> = ({ location }) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'outreach'>('manage');
  
  // Manage Tab State
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(false);
  const [expandedBizId, setExpandedBizId] = useState<string | null>(null);
  const [expandedBizDeals, setExpandedBizDeals] = useState<Deal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);

  // Modals & Forms State
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  const [showAddDeal, setShowAddDeal] = useState<string | null>(null); // holds business ID
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI State
  const [isGeneratingDeal, setIsGeneratingDeal] = useState(false);
  const [analyzingDealId, setAnalyzingDealId] = useState<string | null>(null);
  
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
  }, []);

  useEffect(() => {
    if (activeTab === 'outreach' && leads.length === 0) {
      loadLeads();
    }
  }, [activeTab]);

  useEffect(() => {
    if (expandedBizId) {
        fetchBizDeals(expandedBizId);
    }
  }, [expandedBizId]);

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

  // --- BUSINESS ACTIONS ---

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let website = bizForm.website.trim();
    if (website && !/^https?:\/\//i.test(website)) {
      website = `https://${website}`;
    }

    // Smart Image Fallback
    let finalImageUrl = bizForm.imageUrl;
    if (!finalImageUrl && bizForm.name && bizForm.type) {
        try {
            console.log("Generating smart image for business...");
            finalImageUrl = await generateSmartBusinessImage(bizForm.name, bizForm.type);
        } catch (err) {
            console.error("Smart image generation failed", err);
        }
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

  const openEditBusiness = (biz: Business, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBiz(biz);
    setBizForm({
        name: biz.name,
        type: biz.type,
        address: biz.address,
        website: biz.website,
        imageUrl: biz.imageUrl || '',
        category: biz.category
    });
    setShowAddBusiness(true);
  };

  const handleToggleBizStatus = async (biz: Business, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to ${biz.is_active ? 'retire' : 'activate'} this business?`)) return;
    await db.softDeleteBusiness(biz.id, !biz.is_active);
    refreshDbData();
  };

  const handleDeleteBusiness = async (biz: Business, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("WARNING: This will permanently delete the business and potentially all its deals. Are you sure?")) return;
    await db.deleteBusiness(biz.id);
    refreshDbData();
  };

  // --- DEAL ACTIONS ---

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // If editing, use editingDeal.id. If adding, showAddDeal holds the biz ID
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
                imageUrl: '', // Ignored by DB service, inherited from business
                website: biz.website
            });
            fetchBizDeals(biz.id);
        }
    }

    setDealForm({ title: '', description: '', discount: '', code: '', expiry: '' });
    setShowAddDeal(null);
    setEditingDeal(null);
    setIsSubmitting(false);
    // Refresh businesses to update deal count
    refreshDbData();
  };

  const openEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setDealForm({
        title: deal.title,
        description: deal.description,
        discount: deal.discount,
        code: deal.code,
        expiry: deal.expiry
    });
    setShowAddDeal(deal.business_id);
  };

  const handleToggleDealStatus = async (deal: Deal) => {
    await db.updateDeal(deal.id, { is_active: !deal.is_active });
    fetchBizDeals(deal.business_id);
  };

  const handleDeleteDeal = async (deal: Deal) => {
    if (!confirm("Permanently delete this deal?")) return;
    await db.deleteDeal(deal.id);
    fetchBizDeals(deal.business_id);
    // Refresh businesses to update deal count
    refreshDbData();
  };

  const handleAutoFill = async () => {
      const bizId = showAddDeal;
      const biz = businesses.find(b => b.id === bizId);
      if (!biz) return;

      setIsGeneratingDeal(true);
      const content = await generateDealContent(biz.name, biz.type);
      if (content) {
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

  const handleAnalyzeDeal = async (deal: Deal) => {
      setAnalyzingDealId(deal.id);
      const feedback = await analyzeDeal(deal);
      alert(`Deal Doctor Advice:\n\n${feedback}`);
      setAnalyzingDealId(null);
  };

  // --- OUTREACH ---
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
      const { text, sources } = await generateOutreachEmail(lead.name, lead.type);
      setEmailDraft({ id: lead.id, text, sources });
    } catch (error: any) {
      console.error("Outreach Error:", error);
      alert("Failed to generate email.");
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
          <div className="flex p-1 bg-gray-800 rounded-xl mt-6">
            <button onClick={() => setActiveTab('manage')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'manage' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'}`}>Manage</button>
            <button onClick={() => setActiveTab('outreach')} className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'outreach' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'}`}>Outreach</button>
          </div>
        </div>
      </div>

      {/* MANAGE TAB */}
      {activeTab === 'manage' && (
        <div className="px-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800">My Businesses</h2>
            <button 
              onClick={() => {
                  setEditingBiz(null);
                  setBizForm({ name: '', type: '', address: '', website: '', imageUrl: '', category: 'food' });
                  setShowAddBusiness(true);
              }}
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
                <div key={biz.id} className={`bg-white rounded-xl shadow-sm border transition-all ${biz.is_active === false ? 'opacity-75 border-gray-100 bg-gray-50' : 'border-gray-100'}`}>
                    {/* Business Card Header */}
                    <div 
                        onClick={() => setExpandedBizId(expandedBizId === biz.id ? null : biz.id)}
                        className="p-4 flex items-start gap-3 cursor-pointer"
                    >
                        {/* Avatar / Image */}
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${biz.is_active === false ? 'bg-gray-200' : 'bg-gray-100'}`}>
                            {biz.imageUrl ? (
                                <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" />
                            ) : (
                                <Store className={`w-6 h-6 ${biz.is_active === false ? 'text-gray-400' : 'text-gray-600'}`} />
                            )}
                        </div>
                        
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h3 className={`font-bold ${biz.is_active === false ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{biz.name}</h3>
                                {expandedBizId === biz.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                            </div>
                            <p className="text-xs text-gray-500">{biz.type} • {biz.city} • {biz.dealCount || 0} Deals</p>
                            
                            <div className="flex gap-2 mt-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-md ${biz.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>
                                    {biz.is_active !== false ? 'Active' : 'Retired'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Business Actions (Visible when expanded or not? Maybe always visible but subtle) */}
                    <div className="px-4 pb-3 flex gap-2 justify-end border-b border-gray-50">
                         <button onClick={(e) => openEditBusiness(biz, e)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Edit">
                            <Edit2 className="w-4 h-4" />
                         </button>
                         <button onClick={(e) => handleToggleBizStatus(biz, e)} className={`p-2 rounded-lg ${biz.is_active !== false ? 'text-orange-500 hover:bg-orange-50' : 'text-emerald-500 hover:bg-emerald-50'}`} title={biz.is_active !== false ? 'Retire' : 'Activate'}>
                            <Power className="w-4 h-4" />
                         </button>
                         <button onClick={(e) => handleDeleteBusiness(biz, e)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-lg" title="Delete">
                            <Trash2 className="w-4 h-4" />
                         </button>
                    </div>

                    {/* Expanded Deals Section */}
                    {expandedBizId === biz.id && (
                        <div className="bg-gray-50 p-4 rounded-b-xl border-t border-gray-100">
                             <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase">Deals</h4>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setShowAddDeal(biz.id); setEditingDeal(null); setDealForm({title:'', description:'', discount:'', code:'', expiry: ''}); }}
                                    className="bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-md text-xs font-semibold hover:bg-gray-100"
                                >
                                    + Add Deal
                                </button>
                             </div>

                             {loadingDeals ? (
                                 <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                             ) : expandedBizDeals.length === 0 ? (
                                 <p className="text-xs text-gray-400 text-center py-2">No deals yet.</p>
                             ) : (
                                 <div className="space-y-2">
                                     {expandedBizDeals.map(deal => (
                                         <div key={deal.id} className={`bg-white p-3 rounded-lg border flex justify-between items-center ${deal.is_active === false ? 'opacity-60 bg-gray-50' : ''}`}>
                                             <div className="flex-1">
                                                 <p className={`text-sm font-semibold ${deal.is_active === false ? 'line-through text-gray-500' : 'text-gray-800'}`}>{deal.title}</p>
                                                 <p className="text-xs text-gray-500">{deal.discount} • Code: {deal.code}</p>
                                                 <p className="text-[10px] text-gray-400">Exp: {deal.expiry}</p>
                                             </div>
                                             <div className="flex gap-1">
                                                 {deal.is_active !== false && (
                                                     <button onClick={() => handleAnalyzeDeal(deal)} className="p-1.5 text-indigo-400 hover:text-indigo-600 bg-indigo-50 rounded" title="Deal Doctor">
                                                        {analyzingDealId === deal.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Stethoscope className="w-3 h-3" />}
                                                     </button>
                                                 )}
                                                 <button onClick={() => openEditDeal(deal)} className="p-1.5 text-gray-400 hover:text-gray-700"><Edit2 className="w-3 h-3" /></button>
                                                 <button onClick={() => handleToggleDealStatus(deal)} className={`p-1.5 ${deal.is_active !== false ? 'text-orange-300 hover:text-orange-500' : 'text-emerald-300 hover:text-emerald-500'}`}><Power className="w-3 h-3" /></button>
                                                 <button onClick={() => handleDeleteDeal(deal)} className="p-1.5 text-red-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
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

      {/* OUTREACH TAB */}
      {activeTab === 'outreach' && (
        <div className="px-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="font-bold text-gray-800 mb-4">New Business Leads</h2>
            
            {loadingLeads ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
            ) : leads.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                    <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No leads found in this area.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {leads.map(lead => (
                        <div key={lead.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-900">{lead.name}</h3>
                                    <p className="text-xs text-gray-500">{lead.type} • {lead.location}</p>
                                </div>
                                <span className={`text-[10px] px-2 py-1 rounded-full ${lead.contactStatus === 'new' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {lead.contactStatus.toUpperCase()}
                                </span>
                            </div>
                            
                            {emailDraft?.id === lead.id ? (
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 animate-in fade-in">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xs font-bold text-gray-700">AI Draft Email</h4>
                                        <button onClick={() => setEmailDraft(null)} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
                                    </div>
                                    <textarea 
                                        readOnly 
                                        className="w-full text-xs text-gray-600 bg-white p-2 rounded border border-gray-200 h-32 mb-2 focus:outline-none"
                                        value={emailDraft.text}
                                    />
                                    {emailDraft.sources.length > 0 && (
                                        <div className="mb-2">
                                            <p className="text-[10px] text-gray-400 font-semibold">Sources:</p>
                                            <ul className="text-[10px] text-blue-500">
                                                {emailDraft.sources.map((s: any, i: number) => (
                                                    <li key={i}><a href={s.web?.uri || s.uri} target="_blank" rel="noreferrer" className="hover:underline truncate block">{s.web?.title || s.title}</a></li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <a href={`mailto:?subject=Partnership Opportunity with Lokal&body=${encodeURIComponent(emailDraft.text)}`} className="block w-full bg-blue-600 text-white text-center py-2 rounded-lg text-xs font-bold hover:bg-blue-700">
                                        Open in Mail App
                                    </a>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleDraftEmail(lead)}
                                    disabled={generatingEmail === lead.id}
                                    className="w-full py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                                >
                                    {generatingEmail === lead.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                    Generate Outreach Email
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}

      {/* MODAL: ADD/EDIT BUSINESS */}
      {showAddBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95">
            <button onClick={() => setShowAddBusiness(false)} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
            <h2 className="text-xl font-bold mb-4">{editingBiz ? 'Edit Business' : 'Add Business'}</h2>
            <form onSubmit={handleSaveBusiness} className="space-y-3">
              <input required placeholder="Business Name" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={bizForm.name} onChange={e => setBizForm({...bizForm, name: e.target.value})} />
              <input required placeholder="Type (e.g. Pizza Place)" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={bizForm.type} onChange={e => setBizForm({...bizForm, type: e.target.value})} />
              <select className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={bizForm.category} onChange={e => setBizForm({...bizForm, category: e.target.value})}>
                <option value="food">Food</option>
                <option value="retail">Retail</option>
                <option value="service">Service</option>
              </select>
              <input required placeholder="Address" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={bizForm.address} onChange={e => setBizForm({...bizForm, address: e.target.value})} />
              <input type="text" placeholder="Website URL (e.g. example.com)" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={bizForm.website} onChange={e => setBizForm({...bizForm, website: e.target.value})} />
              <div className="relative">
                  <ImageIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input type="text" placeholder="Image URL (optional)" className="w-full pl-10 pr-3 py-3 bg-gray-50 rounded-xl border border-gray-200" value={bizForm.imageUrl} onChange={e => setBizForm({...bizForm, imageUrl: e.target.value})} />
                  <p className="text-[10px] text-gray-400 mt-1 ml-1">Leave blank to auto-generate with AI ✨</p>
              </div>
              <button disabled={isSubmitting} type="submit" className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold flex justify-center">
                 {isSubmitting ? <Loader2 className="animate-spin" /> : (editingBiz ? 'Save Changes' : 'Create Business')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD/EDIT DEAL */}
      {showAddDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95">
            <button onClick={() => { setShowAddDeal(null); setEditingDeal(null); }} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full"><X className="w-4 h-4" /></button>
            <h2 className="text-xl font-bold mb-4">{editingDeal ? 'Edit Deal' : 'Create New Deal'}</h2>
            
            {!editingDeal && (
                <button 
                    type="button"
                    onClick={handleAutoFill}
                    disabled={isGeneratingDeal}
                    className="w-full mb-4 bg-indigo-50 text-indigo-600 border border-indigo-100 py-3 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    {isGeneratingDeal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Auto-Fill with AI
                </button>
            )}

            <form onSubmit={handleSaveDeal} className="space-y-3">
              <input required placeholder="Deal Title (e.g. 50% Off)" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={dealForm.title} onChange={e => setDealForm({...dealForm, title: e.target.value})} />
              <textarea required placeholder="Description" rows={2} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={dealForm.description} onChange={e => setDealForm({...dealForm, description: e.target.value})} />
              <div className="flex gap-2">
                <input required placeholder="Discount (e.g. $10)" className="w-1/2 p-3 bg-gray-50 rounded-xl border border-gray-200" value={dealForm.discount} onChange={e => setDealForm({...dealForm, discount: e.target.value})} />
                <input required placeholder="Code (e.g. SAVE10)" className="w-1/2 p-3 bg-gray-50 rounded-xl border border-gray-200" value={dealForm.code} onChange={e => setDealForm({...dealForm, code: e.target.value})} />
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Expiration Date</label>
                  <input required type="date" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" value={dealForm.expiry} onChange={e => setDealForm({...dealForm, expiry: e.target.value})} />
              </div>
              <button disabled={isSubmitting} type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold flex justify-center">
                 {isSubmitting ? <Loader2 className="animate-spin" /> : (editingDeal ? 'Update Deal' : 'Publish Deal')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
