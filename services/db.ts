
import { supabase } from './supabase';
import { Business, Deal, UserProfile } from '../types';

export const db = {
  // --- Businesses ---
  
  getBusinesses: async (): Promise<Business[]> => {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching businesses:', error.message);
      return [];
    }
    return data as Business[];
  },

  addBusiness: async (business: Omit<Business, 'id'>): Promise<Business | null> => {
    const { data, error } = await supabase
      .from('businesses')
      .insert([business])
      .select()
      .single();

    if (error) {
      console.error('Error adding business:', error.message);
      alert('Error saving business: ' + error.message);
      return null;
    }
    return data as Business;
  },

  // --- Deals ---

  getDeals: async (): Promise<Deal[]> => {
    // We join businesses to get the name manually to be safe
    const { data: dealsData, error: dealsError } = await supabase
      .from('deals')
      .select('*')
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

    // Map DB result to Deal Interface
    return dealsData.map((d: any) => ({
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
      website: d.website
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
      website: deal.website
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
      website: d.website
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