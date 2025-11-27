
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
}

export interface Business {
  id: string;
  name: string;
  type: string;
  category: 'food' | 'retail' | 'service';
  address: string;
  city: string;
  website: string;
  ownerEmail?: string;
}

export interface BusinessLead {
  id: string;
  name: string;
  type: string;
  location: string;
  contactStatus: 'new' | 'contacted' | 'signed_up';
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

export enum AppMode {
  HOME = 'HOME',
  AUTH = 'AUTH',
  CONSUMER = 'CONSUMER',
  ADMIN = 'ADMIN',
  PROFILE = 'PROFILE'
}