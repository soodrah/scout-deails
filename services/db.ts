
import { supabase } from './supabase';
import { Business, Deal, UserProfile, BusinessLead, PromptHistory } from '../types';

// These IDs match the seed data in the SQL script.
const TEST_BUSINESS_IDS = [
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000005'
];

const PROMPT_HISTORY_KEY = 'lokal_prompt_history';

const shouldShowMocks = () => {
  try {
    return (import.meta as any).env.VITE_ENABLE_MOCK_DATA === 'true';
  } catch (e) {
    return false;
  }
};

export const db = {
  // --- Prompt History ---
  savePrompt: async (history: Omit<PromptHistory, 'id' | 'timestamp'>): Promise<void> => {
    try {
      const stored = localStorage.getItem(PROMPT_HISTORY_KEY);
      const historyList: PromptHistory[] = stored ? JSON.parse(stored) : [];
      
      const newEntry: PromptHistory = {
        ...history,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };
      
      // Keep only last 50 prompts
      const updatedList = [newEntry, ...historyList].slice(0, 50);
      localStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.error('Failed to save prompt history', e);
    }
  },

  getPromptHistory: async (type?: 'search' | 'deal_gen' | 'email_gen'): Promise<PromptHistory[]> => {
    try {
      const stored = localStorage.getItem(PROMPT_HISTORY_KEY);
      if (!stored) return [];
      const historyList: PromptHistory[] = JSON.parse(stored);
      return type ? historyList.filter(h => h.type === type) : historyList;
    } catch (e) {
      console.error('Failed to get prompt history', e);
      return [];
    }
  },

  clearPromptHistory: async (): Promise<void> => {
    localStorage.removeItem(PROMPT_HISTORY_KEY);
  },

  // --- Businesses ---
  
  getBusinesses: async (): Promise<Business[]> => {
    console.log('[DB] Fetching Businesses...');
    let query = supabase
      .from('businesses')
      .select('*, deals(count)')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[DB] Error fetching businesses:', error.message);
      return [];
    }

    let businesses = (data as any[]).map(b => ({
      id: b.id,
      name: b.name,
      type: b.type,
      category: b.category,
      address: b.address,
      city: b.city,
      website: b.website,
      imageUrl: b.image_url, 
      is_active: b.is_active,
      ownerEmail: b.owner_email,
      dealCount: b.deals ? b.deals[0]?.count : 0
    }));

    if (!shouldShowMocks()) {
        businesses = businesses.filter(b => !TEST_BUSINESS_IDS.includes(b.id));
    }

    return businesses;
  },

  addBusiness: async (business: Omit<Business, 'id'>): Promise<Business | null> => {
    console.log('[DB] Adding Business:', business.name);
    const payload = {
      name: business.name,
      type: business.type,
      category: business.category,
      address: business.address,
      city: business.city,
      website: business.website,
      image_url: business.imageUrl, 
      is_active: true
    };

    const { data, error } = await supabase
      .from('businesses')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[DB] Error adding business:', error.message);
      return null;
    }
    
    return {
        ...business,
        id: data.id,
        imageUrl: data.image_url,
        dealCount: 0
    } as Business;
  },

  updateBusiness: async (id: string, updates: Partial<Business>): Promise<boolean> => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.type) dbUpdates.type = updates.type;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.address) dbUpdates.address = updates.address;
    if (updates.website) dbUpdates.website = updates.website;
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl; 
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

    const { error } = await supabase
      .from('businesses')
      .update(dbUpdates)
      .eq('id', id);

    if (error) return false;
    return true;
  },

  softDeleteBusiness: async (id: string, isActive: boolean): Promise<boolean> => {
    return db.updateBusiness(id, { is_active: isActive });
  },

  deleteBusiness: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id);
    return !error;
  },

  // --- Deals ---

  getDeals: async (): Promise<Deal[]> => {
    const { data: dealsData, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .eq('is_active', true) 
      .order('created_at', { ascending: false });

    if (dealsError) return [];

    const { data: bizData } = await supabase
      .from('businesses')
      .select('id, name, image_url');
      
    const bizMap: Record<string, { name: string; imageUrl: string }> = {};
    bizData?.forEach((b: any) => { 
        bizMap[b.id] = { name: b.name, imageUrl: b.image_url }; 
    });

    let deals = dealsData.map((d: any) => ({
      id: d.id,
      business_id: d.business_id,
      businessName: bizMap[d.business_id]?.name || 'Local Business',
      title: d.title,
      description: d.description,
      discount: d.discount,
      category: d.category,
      distance: d.distance || '0.5 miles',
      imageUrl: bizMap[d.business_id]?.imageUrl, 
      code: d.code,
      expiry: d.expiry,
      website: d.website,
      is_active: d.is_active
    }));

    if (!shouldShowMocks()) {
        deals = deals.filter(d => !TEST_BUSINESS_IDS.includes(d.business_id));
    }

    return deals;
  },

  getDealsByBusiness: async (businessId: string): Promise<Deal[]> => {
    const { data: biz } = await supabase.from('businesses').select('image_url').eq('id', businessId).single();
    const bizImage = biz?.image_url;

    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((d: any) => ({
      id: d.id,
      business_id: d.business_id,
      businessName: '', 
      title: d.title,
      description: d.description,
      discount: d.discount,
      category: d.category,
      distance: d.distance,
      imageUrl: bizImage, 
      code: d.code,
      expiry: d.expiry,
      website: d.website,
      is_active: d.is_active
    }));
  },

  addDeal: async (deal: Omit<Deal, 'id'>): Promise<Deal | null> => {
    const dbPayload = {
      business_id: deal.business_id,
      title: deal.title,
      description: deal.description,
      discount: deal.discount,
      category: deal.category,
      distance: deal.distance,
      code: deal.code,
      expiry: deal.expiry,
      website: deal.website,
      is_active: true
    };

    const { data, error } = await supabase
      .from('deals')
      .insert([dbPayload])
      .select()
      .single();

    if (error) return null;

    return {
      ...deal,
      id: data.id
    };
  },

  updateDeal: async (id: string, updates: Partial<Deal>): Promise<boolean> => {
    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.discount) dbUpdates.discount = updates.discount;
    if (updates.code) dbUpdates.code = updates.code;
    if (updates.expiry) dbUpdates.expiry = updates.expiry;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

    const { error } = await supabase
      .from('deals')
      .update(dbUpdates)
      .eq('id', id);

    return !error;
  },

  deleteDeal: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);
    return !error;
  },

  // --- Business Leads ---

  getBusinessLeads: async (): Promise<BusinessLead[]> => {
    const { data, error } = await supabase
      .from('business_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];

    return data.map((l: any) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      location: l.location,
      contactStatus: l.contact_status,
      lastOutreachContent: l.last_outreach_content,
      lastOutreachDate: l.last_outreach_date,
      source: l.source
    }));
  },

  addBusinessLead: async (lead: Omit<BusinessLead, 'id'>): Promise<BusinessLead | null> => {
    const payload = {
      name: lead.name,
      type: lead.type,
      location: lead.location,
      contact_status: lead.contactStatus || 'new',
      source: lead.source || 'manual'
    };

    const { data, error } = await supabase
      .from('business_leads')
      .insert([payload])
      .select()
      .single();

    if (error) return null;

    return {
      ...lead,
      id: data.id
    } as BusinessLead;
  },

  updateBusinessLead: async (id: string, updates: Partial<BusinessLead>): Promise<boolean> => {
    const dbUpdates: any = {};
    if (updates.contactStatus) dbUpdates.contact_status = updates.contactStatus;
    if (updates.lastOutreachContent) dbUpdates.last_outreach_content = updates.lastOutreachContent;
    if (updates.lastOutreachDate) dbUpdates.last_outreach_date = updates.lastOutreachDate;

    const { error } = await supabase
      .from('business_leads')
      .update(dbUpdates)
      .eq('id', id);
    
    return !error;
  },

  // --- User Profile & Interactions ---

  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return null;
    return data as UserProfile;
  },

  updateUserProfile: async (userId: string, updates: { full_name?: string; avatar_url?: string }): Promise<boolean> => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    return !error;
  },

  getSavedDeals: async (userId: string): Promise<Deal[]> => {
    const { data: savedData, error: savedError } = await supabase
      .from('saved_deals')
      .select('deal_id')
      .eq('user_id', userId);

    if (savedError || !savedData || savedData.length === 0) return [];
    const dealIds = savedData.map(s => s.deal_id);

    const { data: dealsData, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .in('id', dealIds);

    if (dealsError) return [];

    const { data: bizData } = await supabase
      .from('businesses')
      .select('id, name, image_url');

    const bizMap: Record<string, {name: string, imageUrl: string}> = {};
    bizData?.forEach((b: any) => { bizMap[b.id] = { name: b.name, imageUrl: b.image_url }; });

    return dealsData.map((d: any) => ({
      id: d.id,
      business_id: d.business_id,
      businessName: bizMap[d.business_id]?.name || 'Local Business',
      title: d.title,
      description: d.description,
      discount: d.discount,
      category: d.category,
      distance: d.distance || 'Varies',
      imageUrl: bizMap[d.business_id]?.imageUrl, 
      code: d.code,
      expiry: d.expiry,
      website: d.website,
      is_active: d.is_active
    }));
  },

  toggleSaveDeal: async (userId: string, dealId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('saved_deals')
      .select('id')
      .eq('user_id', userId)
      .eq('deal_id', dealId)
      .single();

    if (data) {
      await supabase.from('saved_deals').delete().eq('id', data.id);
      return false;
    } else {
      await supabase.from('saved_deals').insert([{ user_id: userId, deal_id: dealId }]);
      return true; 
    }
  },

  redeemDeal: async (userId: string, dealId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('redemptions')
      .insert([{ user_id: userId, deal_id: dealId }]);
    
    if (error) return false;

    const { data: profile } = await supabase.from('profiles').select('points').eq('id', userId).single();
    if (profile) {
      await supabase.from('profiles').update({ points: (profile.points || 0) + 50 }).eq('id', userId);
    }

    return true;
  },

  getRedemptionCount: async (userId: string): Promise<number> => {
    const { count } = await supabase
      .from('redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return count || 0;
  }
};
