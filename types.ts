
export interface Deal {
  id: string;
  businessName: string;
  title: string;
  description: string;
  discount: string;
  category: 'food' | 'retail' | 'service';
  distance: string;
  imageUrl: string;
  code: string;
  expiry: string;
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

export enum AppMode {
  CONSUMER = 'CONSUMER',
  ADMIN = 'ADMIN',
  PROFILE = 'PROFILE'
}
