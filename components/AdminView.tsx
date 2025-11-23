import React, { useState, useEffect } from 'react';
import { Briefcase, Mail, CheckCircle, RefreshCw, ChevronRight, Sparkles, ExternalLink, Key } from 'lucide-react';
import { BusinessLead, UserLocation } from '../types';
import { fetchBusinessLeads, generateOutreachEmail } from '../services/geminiService';

interface AdminViewProps {
  location: UserLocation;
}

const AdminView: React.FC<AdminViewProps> = ({ location }) => {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ id: string; text: string; sources: any[] } | null>(null);

  useEffect(() => {
    loadLeads();
  }, [location.city]);

  const loadLeads = async () => {
    setLoading(true);
    const data = await fetchBusinessLeads(location.lat, location.lng, location.city);
    setLeads(data);
    setLoading(false);
  };

  const handleDraftEmail = async (lead: BusinessLead) => {
    setGeneratingEmail(lead.id);
    setEmailDraft(null);
    
    try {
      // 1. Check for API key presence if running in AI Studio environment
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
           await (window as any).aistudio.openSelectKey();
        }
      }

      const { text, sources } = await generateOutreachEmail(lead.name, lead.type);
      setEmailDraft({ id: lead.id, text, sources });
    } catch (error: any) {
      console.error("Outreach Error:", error);
      
      // Check for permission denied / 403 errors which indicate missing paid API key
      const isPermissionError = error.message?.includes('403') || 
                                error.message?.includes('permission') || 
                                error.status === 403 ||
                                JSON.stringify(error).includes("PERMISSION_DENIED");

      if (isPermissionError && (window as any).aistudio) {
        try {
          // Trigger the key selection dialog
          await (window as any).aistudio.openSelectKey();
          // We can't auto-retry easily because of the async nature, so we ask the user to click again
          alert("Key selected! Please click 'Draft Email' again to generate.");
        } catch (e) {
          console.error("Failed to select key:", e);
        }
      } else {
        alert("Failed to generate email. Please try again.");
      }
    } finally {
      setGeneratingEmail(null);
    }
  };

  return (
    <div className="pb-24">
      {/* Admin Header */}
      <div className="bg-gray-900 text-white px-6 py-8 rounded-b-[2.5rem] shadow-xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Briefcase size={100} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-bold tracking-wider uppercase">Business Growth</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Partner Outreach</h1>
          <p className="text-gray-400 text-sm">Find and contact local businesses to join Scout.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800">Potential Leads near {location.city || 'Current Location'}</h2>
          <button 
            onClick={loadLeads} 
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
             {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
             ))}
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <div key={lead.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{lead.name}</h3>
                    <p className="text-xs text-gray-500 mb-1">{lead.type} • {lead.location}</p>
                    <div className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${lead.contactStatus === 'new' ? 'bg-blue-500' : 'bg-green-500'}`} />
                      <span className="text-xs font-medium text-gray-600 capitalize">{lead.contactStatus.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDraftEmail(lead)}
                    disabled={generatingEmail === lead.id}
                    className="flex items-center gap-1 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {generatingEmail === lead.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Mail className="w-3 h-3" />
                    )}
                    Draft Email
                  </button>
                </div>

                {/* Email Draft Preview */}
                {emailDraft && emailDraft.id === lead.id && (
                  <div className="mt-4 pt-4 border-t border-dashed border-gray-200 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Draft</span>
                       <button 
                          onClick={() => setEmailDraft(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Close
                       </button>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 whitespace-pre-wrap mb-3 border border-gray-100 font-mono leading-relaxed">
                      {emailDraft.text}
                    </div>
                    
                    {/* Sources / Grounding */}
                    {emailDraft.sources && emailDraft.sources.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {emailDraft.sources.map((source: any, idx: number) => {
                            // Extract title and uri safely
                            const uri = source.web?.uri;
                            const title = source.web?.title || new URL(uri).hostname;
                            if (!uri) return null;
                            
                            return (
                              <a 
                                key={idx} 
                                href={uri} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{title}</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button className="flex-1 bg-emerald-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-600 transition-colors">
                        Send via Gmail
                      </button>
                      <button 
                        className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                        onClick={() => navigator.clipboard.writeText(emailDraft.text)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {leads.length === 0 && !loading && (
                <div className="text-center text-gray-400 py-8">
                    <p>No leads generated yet.</p>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminView;