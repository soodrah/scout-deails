
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
    let query = supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching businesses:', error.message);
      return [];
    }

    let businesses = data as Business[];

    if (!shouldShowMocks()) {
        businesses = businesses.filter(b => !TEST_BUSINESS_IDS.includes(b.id));
    }

    return businesses;
  },

  addBusiness: async (business: Omit<Business, 'id'>): Promise<Business | null> => {
    const { data, error } = await supabase
      .from('businesses')
      .insert([business])
      .select()
      .single();

    if (error) {
      console.error('Error adding business:', error.message);
      if (error.message.includes('row-level security') || error.message.includes('permission denied')) {
        alert('Database Permission Error: Please run the RLS policies SQL script in Supabase.');
      } else {
        alert('Error saving business: ' + error.message);
      }
      return null;
    }
    return data as Business;
  },

  updateBusiness: async (id: string, updates: Partial<Business>): Promise<boolean> => {
    const { error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating business:', error.message);
      alert('Error updating business: ' + error.message);
      return false;
    }
    return true;
  },

  softDeleteBusiness: async (id: string, isActive: boolean): Promise<boolean> => {
    return db.updateBusiness(id, { is_active: isActive });
  },

  deleteBusiness: async (id: string): Promise<boolean> => {
    // Note: This might fail if there are deals linked to it (Foreign Key Constraint)
    // You should usually delete deals first or use soft delete.
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting business:', error.message);
      alert('Error deleting business (ensure all deals are deleted first): ' + error.message);
      return false;
    }
    return true;
  },

  // --- Deals ---

  getDeals: async (): Promise<Deal[]> => {
    // We join businesses to get the name manually to be safe
    const { data: dealsData, error: dealsError } = await supabase
      .from('deals')
      .select('*')
      .eq('is_active', true) // Only show active deals to consumers
      .order('created_at', { ascending: false });

    if (dealsError) {
      console.error('Error fetching deals:', dealsError.message);
      return [];
    }

    const { data: bizData, error: bizError } = await supabase
      .from('businesses')
      .select('id, name');
      
    if (bizError) {
       console.error('Error fetching businesses for deals:', bizError.message);
    }

    // Create a map for fast lookup
    const bizMap: Record<string, string> = {};
    bizData?.forEach((b: any) => { bizMap[b.id] = b.name; });

    let deals = dealsData.map((d: any) => ({
      id: d.id,
      business_id: d.business_id,
      businessName: bizMap[d.business_id] || 'Local Business',
      title: d.title,
      description: d.description,
      discount: d.discount,
      category: d.category,
      distance: d.distance || '0.5 miles',
      imageUrl: d.image_url,
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
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching business deals:', error.message);
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
      imageUrl: d.image_url,
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
      image_url: deal.imageUrl,
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
      console.error('Error adding deal:', error.message);
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
    // Map camelCase to snake_case for DB
    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.description) dbUpdates.description = updates.description;
    if (updates.discount) dbUpdates.discount = updates.discount;
    if (updates.code) dbUpdates.code = updates.code;
    if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

    const { error } = await supabase
      .from('deals')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating deal:', error.message);
      return false;
    }
    return true;
  },

  deleteDeal: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting deal:', error.message);
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
      console.error('Error fetching profile:', error.message);
      return null;
    }
    return data as UserProfile;
  },

  updateUserProfile: async (userId: string, updates: { full_name?: string; avatar_url?: string }): Promise<boolean> => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) {
        console.error("Profile Update Error", error.message);
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

    // We also need business names
    const { data: bizData } = await supabase
      .from('businesses')
      .select('id, name');

    const bizMap: Record<string, string> = {};
    bizData?.forEach((b: any) => { bizMap[b.id] = b.name; });

    return dealsData.map((d: any) => ({
      id: d.id,
      business_id: d.business_id,
      businessName: bizMap[d.business_id] || 'Local Business',
      title: d.title,
      description: d.description,
      discount: d.discount,
      category: d.category,
      distance: d.distance || 'Varies',
      imageUrl: d.image_url,
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
    const { error } = await supabase
      .from('redemptions')
      .insert([{ user_id: userId, deal_id: dealId }]);
    
    if (error) {
      console.error("Redemption Error", error);
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
