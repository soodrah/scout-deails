
import React, { useState, useEffect } from 'react';
import { Briefcase, Mail, RefreshCw, Sparkles, ExternalLink, Plus, Store, Tag, X, ChevronRight, Loader2, Edit2, Trash2, Power, ChevronDown, ChevronUp, Image as ImageIcon, Stethoscope, MessageSquare, CheckCircle, Clock, DollarSign, FileText, Calendar } from 'lucide-react';
import { BusinessLead, UserLocation, Business, Deal, PromptHistory, Contract, ConsumerUsage } from '../types';
import { fetchBusinessLeads, generateOutreachEmail, generateDealContent, analyzeDeal, generateSmartBusinessImage } from '../services/geminiService';
import { db } from '../services/db';

interface AdminViewProps {
  location: UserLocation;
}

const AdminView: React.FC<AdminViewProps> = ({ location }) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'outreach' | 'money' | 'history'>('manage');
  
  // Manage Tab State
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(false);
  const [expandedBizId, setExpandedBizId] = useState<string | null>(null);
  const [expandedBizDeals, setExpandedBizDeals] = useState<Deal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);

  // Money Tab State
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [usages, setUsages] = useState<ConsumerUsage[]>([]);
  const [showContractForm, setShowContractForm] = useState<string | null>(null); // bizId
  const [contractData, setContractData] = useState({ 
      ownerName: '', 
      phone: '',
      address: '',
      email: '',
      commission: '5' 
  });
  const [editingUsage, setEditingUsage] = useState<ConsumerUsage | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });

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
    const [bizData, contractData, usageData] = await Promise.all([
        db.getBusinesses(),
        db.getContracts(),
        db.getUsageDetails()
    ]);
    setBusinesses(bizData);
    setContracts(contractData);
    setUsages(usageData);
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

  const handleCreateContract = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!showContractForm) return;

      const biz = businesses.find(b => b.id === showContractForm);
      if (!biz) return;

      await db.addContract({
          business_id: biz.id,
          restaurant_name: biz.name,
          owner_name: contractData.ownerName,
          commission_percentage: parseFloat(contractData.commission)
      }, {
          phone_number: contractData.phone,
          street_address: contractData.address,
          email: contractData.email
      });

      setShowContractForm(null);
      setContractData({ ownerName: '', phone: '', address: '', email: '', commission: '5' });
      refreshDbData();
  };

  const handleUpdatePayment = async () => {
      if (!editingUsage) return;
      await db.updateUsagePayment(editingUsage.id, parseFloat(paymentForm.amount), paymentForm.date);
      setEditingUsage(null);
      refreshDbData();
  };

  return (
    <div className="pb-24">
      {/* Admin Header */}
      <div className="bg-gray-900 dark:bg-black text-white px-6 py-8 rounded-b-[2.5rem] shadow-xl mb-6 relative overflow-hidden transition-all duration-300">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-1">Owner Dashboard</h1>
          <p className="text-gray-400 text-xs">Manage portfolio and AI activity</p>
          <div className="flex p-1 bg-gray-800 rounded-xl mt-6 overflow-x-auto no-scrollbar">
            {['manage', 'money', 'outreach', 'history'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)} 
                className={`flex-1 py-2 px-3 text-sm font-semibold rounded-lg transition-all capitalize whitespace-nowrap ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-white'}`}
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

      {/* MONEY TAB (NEW) */}
      {activeTab === 'money' && (
        <div className="px-4 animate-in fade-in slide-in-from-right-4 duration-300 space-y-8">
            {/* Contracts Section */}
            <section>
                <h2 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    Contracts
                </h2>
                
                {/* List Businesses without contracts */}
                <div className="grid grid-cols-1 gap-3">
                    {businesses.filter(b => !contracts.find(c => c.business_id === b.id)).length > 0 && (
                        <h3 className="text-xs font-bold text-gray-400 uppercase mt-2">Pending Signatures</h3>
                    )}
                    {businesses.filter(b => !contracts.find(c => c.business_id === b.id)).map(b => (
                         <div key={b.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white">{b.name}</h4>
                                <p className="text-xs text-gray-500">No contract active</p>
                            </div>
                            <button 
                                onClick={() => setShowContractForm(b.id)}
                                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                            >
                                Create Contract
                            </button>
                         </div>
                    ))}

                    <h3 className="text-xs font-bold text-gray-400 uppercase mt-4">Active Contracts</h3>
                    {contracts.map(c => (
                        <div key={c.id} className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                             <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{c.restaurant_name}</h4>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono mt-1">
                                        COMMISSION: {c.commission_percentage}%
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-2">
                                        Owner: {c.owner_name}
                                        {c.contact_info && (
                                            <span className="block mt-1">
                                                {c.contact_info.phone_number} • {c.contact_info.email}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                             </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Revenue / Usage Section */}
            <section>
                 <h2 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    Revenue Ledger
                </h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Deal Details</th>
                                    <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Commission</th>
                                    <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                    <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {usages.map(u => (
                                    <tr key={u.id}>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{u.consumer_email}</div>
                                            <div className="text-xs text-gray-500">{u.details_of_deal}</div>
                                            <div className="text-[10px] text-gray-400">{new Date(u.date_of_deal).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-gray-900 dark:text-white">
                                            ${u.commission_due.toFixed(2)}
                                        </td>
                                        <td className="p-4">
                                            {u.date_commission_was_paid ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    Paid ${u.amount_received}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {!u.date_commission_was_paid && (
                                                <button 
                                                    onClick={() => {
                                                        setEditingUsage(u);
                                                        setPaymentForm({ amount: u.commission_due.toString(), date: new Date().toISOString().split('T')[0] });
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-800 font-bold text-xs"
                                                >
                                                    Mark Paid
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {usages.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-400">No redemptions recorded yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
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
      
      {/* Contract Modal */}
      {showContractForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
                <button onClick={() => setShowContractForm(null)} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X className="w-4 h-4 dark:text-white" /></button>
                <h2 className="text-xl font-bold mb-4 dark:text-white">New Contract</h2>
                <form onSubmit={handleCreateContract} className="space-y-3">
                    <input required placeholder="Owner Name" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={contractData.ownerName} onChange={e => setContractData({...contractData, ownerName: e.target.value})} />
                    
                    <div className="pt-2 border-t dark:border-gray-700">
                        <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Contact Information</label>
                        <div className="space-y-2">
                             <input required placeholder="Phone Number" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={contractData.phone} onChange={e => setContractData({...contractData, phone: e.target.value})} />
                             <input required placeholder="Email Address" type="email" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={contractData.email} onChange={e => setContractData({...contractData, email: e.target.value})} />
                             <input required placeholder="Street Address" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={contractData.address} onChange={e => setContractData({...contractData, address: e.target.value})} />
                        </div>
                    </div>

                    <div className="pt-2">
                        <label className="text-xs text-gray-500 font-bold ml-1">Commission %</label>
                        <input type="number" required placeholder="5.0" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={contractData.commission} onChange={e => setContractData({...contractData, commission: e.target.value})} />
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">Sign Contract</button>
                </form>
           </div>
        </div>
      )}

      {/* Payment Modal */}
      {editingUsage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95">
                <button onClick={() => setEditingUsage(null)} className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X className="w-4 h-4 dark:text-white" /></button>
                <h2 className="text-xl font-bold mb-4 dark:text-white">Record Payment</h2>
                <div className="space-y-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700">
                        <p className="text-xs text-gray-500">Commission Due</p>
                        <p className="text-lg font-bold dark:text-white">${editingUsage.commission_due.toFixed(2)}</p>
                    </div>
                    <input type="number" step="0.01" required placeholder="Amount Received" className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
                    <input type="date" required className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 dark:text-white" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} />
                    <button onClick={handleUpdatePayment} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">Update Ledger</button>
                </div>
            </div>
          </div>
      )}

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
