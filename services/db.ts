
import { supabase } from './supabase';
import { Business, Deal, UserProfile, BusinessLead, PromptHistory, Contract, ConsumerUsage, Contact, ContractAssignment } from '../types';

// These IDs match the seed data in the SQL script.
const TEST_BUSINESS_IDS = [
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000005'
];

// HARDCODED OWNER EMAIL TO BYPASS BROKEN DB POLICIES
const SUPER_ADMIN_EMAIL = 'soodrah@gmail.com';

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

  // --- Contracts & Monetization ---

  getContracts: async (): Promise<Contract[]> => {
    // 1. Get Contracts
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('*');
    
    if (error || !contracts) return [];

    // 2. Get Assignments & Contacts for these contracts
    // Note: Supabase JS select joins are easier, but sometimes explicit queries are safer with custom schema
    // Let's use a join query:
    const { data: assignments } = await supabase
      .from('contract_assignments')
      .select('*, contacts(*)');

    // 3. Map assignments back to contracts
    return contracts.map((c: any) => {
        const relevantAssignments = assignments?.filter((a: any) => a.contract_id === c.id) || [];
        
        const mappedAssignments: ContractAssignment[] = relevantAssignments.map((a: any) => ({
            id: a.id,
            contract_id: a.contract_id,
            contact_id: a.contact_id,
            role: a.role,
            contact: a.contacts ? {
                id: a.contacts.id,
                name: a.contacts.name,
                phone_number: a.contacts.phone_number,
                street_address: a.contacts.street_address,
                email: a.contacts.email
            } : undefined
        }));

        return {
            id: c.id,
            business_id: c.business_id,
            restaurant_name: c.restaurant_name,
            commission_percentage: c.commission_percentage,
            date_of_contract: c.created_at,
            assignments: mappedAssignments
        };
    });
  },

  addContract: async (
      contract: Omit<Contract, 'id' | 'date_of_contract' | 'assignments'>, 
      contactInfo: Omit<Contact, 'id'> // The primary owner's details
  ): Promise<Contract | null> => {
    
    // 1. Insert Contract
    const { data: contractData, error: contractError } = await supabase
      .from('contracts')
      .insert([{
        business_id: contract.business_id,
        restaurant_name: contract.restaurant_name,
        commission_percentage: contract.commission_percentage
      }])
      .select()
      .single();

    if (contractError || !contractData) {
      console.error("Error creating contract", contractError);
      return null;
    }

    // 2. Insert Contact (Person)
    const { data: contactDataRes, error: contactError } = await supabase
      .from('contacts')
      .insert([{
          name: contactInfo.name,
          phone_number: contactInfo.phone_number,
          street_address: contactInfo.street_address,
          email: contactInfo.email
      }])
      .select()
      .single();

    if (contactError || !contactDataRes) {
        console.error("Error creating contact", contactError);
        return null; 
    }

    // 3. Create Assignment (Link them)
    await supabase.from('contract_assignments').insert([{
        contract_id: contractData.id,
        contact_id: contactDataRes.id,
        role: 'owner'
    }]);

    return {
      ...contract,
      id: contractData.id,
      date_of_contract: contractData.created_at,
      assignments: [{
          id: 'temp', 
          contract_id: contractData.id,
          contact_id: contactDataRes.id,
          role: 'owner',
          contact: { ...contactInfo, id: contactDataRes.id }
      }]
    };
  },

  getUsageDetails: async (): Promise<ConsumerUsage[]> => {
    const { data, error } = await supabase
      .from('consumer_usage_details')
      .select('*')
      .order('date_of_deal', { ascending: false });

    if (error) return [];

    return data.map((u: any) => ({
      id: u.id,
      deal_id: u.deal_id,
      consumer_email: u.consumer_email,
      details_of_deal: u.details_of_deal,
      date_of_deal: u.date_of_deal,
      commission_due: u.commission_due,
      date_commission_was_paid: u.date_commission_was_paid,
      amount_received: u.amount_received
    }));
  },

  updateUsagePayment: async (usageId: string, amount: number, datePaid: string): Promise<boolean> => {
    const { error } = await supabase
      .from('consumer_usage_details')
      .update({
        amount_received: amount,
        date_commission_was_paid: datePaid
      })
      .eq('id', usageId);
    
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
    // 0. Get current session to check against
    const { data: { session } } = await supabase.auth.getSession();
    console.log(`[DB] getUserProfile called for: ${userId}.`);

    // 1. Try to get existing profile from DB
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, points, full_name, avatar_url') 
      .eq('id', userId)
      .maybeSingle();

    if (data) {
        console.log('[DB] Profile found:', data.role);
        return data as UserProfile;
    } 

    if (error) {
       console.warn('[DB] Supabase error fetching profile (might be missing):', error.message);
    }

    // 2. Profile missing? Create it! 
    // We assume the SQL policy "Insert profile" is now active and allows authenticated inserts.
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && user.id === userId) {
        console.log('[DB] Profile missing in DB. Attempting to create new profile.');
        
        const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
        const meta = user.user_metadata || {};
        
        const newProfile = {
            id: userId,
            email: user.email || '',
            role: isSuperAdmin ? 'admin' : 'consumer', 
            points: isSuperAdmin ? 999 : 50, // Bonus points for signing up
            full_name: meta.full_name || meta.name || '',
            avatar_url: meta.avatar_url || meta.picture || ''
        };

        const { error: insertError } = await supabase
            .from('profiles')
            .insert([newProfile]);

        if (insertError) {
             console.error('[DB] Failed to insert profile:', insertError.message);
             // Fallback: Return transient profile so app doesn't crash
             return newProfile as UserProfile;
        }

        return newProfile as UserProfile;
    }

    return null;
  },

  updateUserProfile: async (userId: string, updates: { full_name?: string; avatar_url?: string }): Promise<boolean> => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) {
        console.warn('[DB] Failed to update profile:', error.message);
        return false;
    }
    return true;
  },

  // --- RBAC: Admin Management ---

  getAdmins: async (): Promise<UserProfile[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, points, full_name, avatar_url')
      .eq('role', 'admin');

    if (error) return [];
    return data as UserProfile[];
  },

  promoteUserToAdmin: async (email: string): Promise<{ success: boolean; message: string }> => {
    // 1. Find user by email
    const { data: users, error: searchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (searchError || !users) {
      return { success: false, message: "User not found. They must sign up first." };
    }

    // 2. Update role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', users.id);

    if (updateError) {
      return { success: false, message: "Failed to update role. " + updateError.message };
    }

    return { success: true, message: "User promoted to Admin successfully." };
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
    // 1. Fetch Deal Info
    const { data: deal } = await supabase.from('deals').select('*').eq('id', dealId).single();
    if (!deal) return false;

    // 2. Fetch User Info (for email)
    const { data: user } = await supabase.auth.getUser(); // or fetch profile

    // 3. Check for Contract to Calculate Commission
    const { data: contract } = await supabase
      .from('contracts')
      .select('commission_percentage')
      .eq('business_id', deal.business_id)
      .single();
    
    // Default estimated commission logic: 
    // If contract exists: (Percentage * Assumed Basket Value $40)
    // If no contract: 0
    let commissionDue = 0;
    if (contract) {
        const percentage = contract.commission_percentage || 0;
        commissionDue = (40 * percentage) / 100; // Assuming $40 average spend as per prompt
    }

    // 4. Record Usage in 'consumer_usage_details'
    await supabase.from('consumer_usage_details').insert([{
        deal_id: dealId,
        consumer_email: user?.user?.email || 'unknown',
        details_of_deal: `${deal.title} - ${deal.discount}`,
        date_of_deal: new Date().toISOString(),
        commission_due: commissionDue
    }]);

    // 5. Update Legacy Points System
    const { error: redemptionError } = await supabase
      .from('redemptions')
      .insert([{ user_id: userId, deal_id: dealId }]);
    
    if (redemptionError) return false;

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
