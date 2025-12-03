
import { supabase } from './supabase';
import { Business, Deal, UserProfile } from '../types';

// These IDs match the seed data in the SQL script.
// We filter them out in production to ensure the app is clean.
const TEST_BUSINESS_IDS = [
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002',
  'b1000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000005'
];

// Helper to check if we should show mock data
const shouldShowMocks = () => {
  try {
    return (import.meta as any).env.VITE_ENABLE_MOCK_DATA === 'true';
  } catch (e) {
    return false;
  }
};

export const db = {
  // --- Businesses ---
  
  getBusinesses: async (): Promise<Business[]> => {
    console.log('[DB] Fetching Businesses...');
    // Select businesses and count their related deals
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
      imageUrl: b.image_url, // Map from DB snake_case
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
    // Map to DB snake_case
    const payload = {
      name: business.name,
      type: business.type,
      category: business.category,
      address: business.address,
      city: business.city,
      website: business.website,
      image_url: business.imageUrl, // Map to DB snake_case
      is_active: true
    };

    const { data, error } = await supabase
      .from('businesses')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[DB] Error adding business:', error.message);
      if (error.message.includes('row-level security') || error.message.includes('permission denied')) {
        alert('Database Permission Error: Please run the RLS policies SQL script in Supabase.');
      } else {
        alert('Error saving business: ' + error.message);
      }
      return null;
    }
    
    // Return mapped object
    return {
        ...business,
        id: data.id,
        imageUrl: data.image_url,
        dealCount: 0
    } as Business;
  },

  updateBusiness: async (id: string, updates: Partial<Business>): Promise<boolean> => {
    console.log('[DB] Updating Business:', id);
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.type) dbUpdates.type = updates.type;
    if (updates.category) dbUpdates.category = updates.category;
    if (updates.address) dbUpdates.address = updates.address;
    if (updates.website) dbUpdates.website = updates.website;
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl; // Map to DB
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

    const { error } = await supabase
      .from('businesses')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('[DB] Error updating business:', error.message);
      alert('Error updating business: ' + error.message);
      return false;
    }
    return true;
  },

  softDeleteBusiness: async (id: string, isActive: boolean): Promise<boolean> => {
    console.log(`[DB] Soft Delete Business: ${id} (Active: ${isActive})`);
    return db.updateBusiness(id, { is_active: isActive });
  },

  deleteBusiness: async (id: string): Promise<boolean> => {
    console.log('[DB] Hard Delete Business:', id);
    // Note: This might fail if there are deals linked to it (Foreign Key Constraint)
    // You should usually delete deals first or use soft delete.
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DB] Error deleting business:', error.message);
      alert('Error deleting business (ensure all deals are deleted first): ' + error.message);
      return false;
    }
    return true;
  },

  // --- Deals ---

  getDeals: async (): Promise<Deal[]> => {
    console.log('[DB] Fetching Deals...');
    // We join businesses to get the name manually to be safe
    const { data: dealsData, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .eq('is_active', true) // Only show active deals to consumers
      .order('created_at', { ascending: false });

    if (dealsError) {
      console.error('[DB] Error fetching deals:', dealsError.message);
      return [];
    }

    // Fetch business info including IMAGE_URL now
    const { data: bizData, error: bizError } = await supabase
      .from('businesses')
      .select('id, name, image_url');
      
    if (bizError) {
       console.error('[DB] Error fetching businesses for deals:', bizError.message);
    }

    // Create a map for fast lookup
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
      imageUrl: bizMap[d.business_id]?.imageUrl, // Use Business Image
      code: d.code,
      expiry: d.expiry,
      website: d.website,
      is_active: d.is_active
    }));

    // Filter out deals from test businesses if not in mock mode
    if (!shouldShowMocks()) {
        deals = deals.filter(d => !TEST_BUSINESS_IDS.includes(d.business_id));
    }

    return deals;
  },

  getDealsByBusiness: async (businessId: string): Promise<Deal[]> => {
    console.log('[DB] Fetching Deals for Business:', businessId);
    // Fetch business image first
    const { data: biz } = await supabase.from('businesses').select('image_url').eq('id', businessId).single();
    const bizImage = biz?.image_url;

    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DB] Error fetching business deals:', error.message);
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      business_id: d.business_id,
      businessName: '', // Not needed for this view usually
      title: d.title,
      description: d.description,
      discount: d.discount,
      category: d.category,
      distance: d.distance,
      imageUrl: bizImage, // Apply business image
      code: d.code,
      expiry: d.expiry,
      website: d.website,
      is_active: d.is_active
    }));
  },

  addDeal: async (deal: Omit<Deal, 'id'>): Promise<Deal | null> => {
    console.log('[DB] Adding Deal:', deal.title);
    const dbPayload = {
      business_id: deal.business_id,
      title: deal.title,
      description: deal.description,
      discount: deal.discount,
      category: deal.category,
      distance: deal.distance,
      // REMOVED image_url from payload
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

    if (error) {
      console.error('[DB] Error adding deal:', error.message);
      alert('Error saving deal: ' + error.message);
      return null;
    }

    // Return with business name (we know it since we passed it in)
    return {
      ...deal,
      id: data.id
    };
  },

  updateDeal: async (id: string, updates: Partial<Deal>): Promise<boolean> => {
    console.log('[DB] Updating Deal:', id);
    // Map camelCase to snake_case for DB
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

    if (error) {
      console.error('[DB] Error updating deal:', error.message);
      return false;
    }
    return true;
  },

  deleteDeal: async (id: string): Promise<boolean> => {
    console.log('[DB] Deleting Deal:', id);
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[DB] Error deleting deal:', error.message);
      return false;
    }
    return true;
  },

  // --- User Profile & Interactions ---

  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[DB] Error fetching profile:', error.message);
      return null;
    }
    return data as UserProfile;
  },

  updateUserProfile: async (userId: string, updates: { full_name?: string; avatar_url?: string }): Promise<boolean> => {
    console.log('[DB] Updating Profile:', userId);
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) {
        console.error("[DB] Profile Update Error", error.message);
        return false;
    }
    return true;
  },

  getSavedDeals: async (userId: string): Promise<Deal[]> => {
    // Get the deal IDs first
    const { data: savedData, error: savedError } = await supabase
      .from('saved_deals')
      .select('deal_id')
      .eq('user_id', userId);

    if (savedError || !savedData || savedData.length === 0) return [];

    const dealIds = savedData.map(s => s.deal_id);

    // Fetch the actual deals
    const { data: dealsData, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .in('id', dealIds);

    if (dealsError) return [];

    // We also need business names and IMAGES
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
      imageUrl: bizMap[d.business_id]?.imageUrl, // Inherit image
      code: d.code,
      expiry: d.expiry,
      website: d.website,
      is_active: d.is_active
    }));
  },

  toggleSaveDeal: async (userId: string, dealId: string): Promise<boolean> => {
    // Check if exists
    const { data } = await supabase
      .from('saved_deals')
      .select('id')
      .eq('user_id', userId)
      .eq('deal_id', dealId)
      .single();

    if (data) {
      // Unsave
      await supabase.from('saved_deals').delete().eq('id', data.id);
      return false; // Not saved anymore
    } else {
      // Save
      await supabase.from('saved_deals').insert([{ user_id: userId, deal_id: dealId }]);
      return true; // Saved
    }
  },

  isDealSaved: async (userId: string, dealId: string): Promise<boolean> => {
     const { data } = await supabase
      .from('saved_deals')
      .select('id')
      .eq('user_id', userId)
      .eq('deal_id', dealId)
      .single();
    return !!data;
  },

  redeemDeal: async (userId: string, dealId: string): Promise<boolean> => {
    console.log('[DB] Redeeming Deal:', dealId);
    const { error } = await supabase
      .from('redemptions')
      .insert([{ user_id: userId, deal_id: dealId }]);
    
    if (error) {
      console.error("[DB] Redemption Error", error);
      return false;
    }

    // Add points to profile
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
