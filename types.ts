
export interface Deal {
  id: string;
  business_id: string; // Link to business (Required, snake_case)
  businessName: string;
  title: string;
  description: string;
  discount: string;
  category: 'food' | 'retail' | 'service';
  distance: string;
  imageUrl: string;
  code: string;
  expiry: string;
  website: string;
  is_active?: boolean;
}

export interface Business {
  id: string;
  name: string;
  type: string;
  category: 'food' | 'retail' | 'service';
  address: string;
  city: string;
  website: string;
  imageUrl?: string;
  ownerEmail?: string;
  is_active?: boolean;
  dealCount?: number;
}

export interface BusinessLead {
  id: string;
  name: string;
  type: string;
  location: string;
  contactStatus: 'new' | 'contacted' | 'signed_up';
  lastOutreachContent?: string;
  lastOutreachDate?: string;
  source?: 'ai' | 'manual';
}

// Normalized Contact (Person)
export interface Contact {
  id: string;
  name: string;
  phone_number: string;
  street_address: string;
  email: string;
}

// Junction Table Data
export interface ContractAssignment {
  id: string;
  contract_id: string;
  contact_id: string;
  role: string;
  contact?: Contact; // Hydrated data for UI
}

export interface Contract {
  id: string;
  business_id: string;
  restaurant_name: string;
  commission_percentage: number;
  date_of_contract: string;
  // Relationship
  assignments?: ContractAssignment[];
}

export interface ConsumerUsage {
  id: string;
  deal_id: string;
  consumer_email: string;
  details_of_deal: string; // Snapshot of title/discount
  date_of_deal: string;
  commission_due: number;
  date_commission_was_paid?: string; // Nullable until paid
  amount_received?: number; // Nullable until paid
  business_name?: string; // Helper for UI
}

export interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'consumer' | 'admin';
  points: number;
  full_name?: string;
  avatar_url?: string;
}

export interface PromptHistory {
  id: string;
  timestamp: string;
  type: 'search' | 'deal_gen' | 'email_gen';
  prompt: string;
  resultSummary?: string;
  metadata?: any;
}

export enum AppMode {
  HOME = 'HOME',
  AUTH = 'AUTH',
  CONSUMER = 'CONSUMER',
  ADMIN = 'ADMIN',
  PROFILE = 'PROFILE'
}
