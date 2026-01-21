
-- 1. Create Contracts Table
-- This stores the commission agreement between you and the business.
create table public.contracts (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  restaurant_name text not null,
  owner_name text,
  -- Contact details moved to separate table for normalization
  commission_percentage numeric default 0, -- e.g., 2.0 for 2%
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Contract Contacts Table (Normalization)
-- Stores structured contact info linked to a specific contract.
create table public.contract_contacts (
  id uuid default gen_random_uuid() primary key,
  contract_id uuid references public.contracts(id) on delete cascade not null,
  phone_number text,
  street_address text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Consumer Usage Details Table
-- This tracks every time a QR code is scanned/redeemed and calculates what you are owed.
create table public.consumer_usage_details (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references public.deals(id) on delete set null, -- Keeps record even if deal is deleted
  consumer_email text,
  details_of_deal text, -- Snapshot of deal title/discount at time of usage
  date_of_deal timestamp with time zone default timezone('utc'::text, now()) not null,
  commission_due numeric default 0, -- Calculated amount you are owed based on contract
  date_commission_was_paid timestamp with time zone, -- Null until you mark it as paid
  amount_received numeric default 0 -- The actual amount you collected
);

-- 4. Enable Row Level Security (RLS)
alter table public.contracts enable row level security;
alter table public.contract_contacts enable row level security;
alter table public.consumer_usage_details enable row level security;

-- 5. Create Basic Policies
create policy "Enable all access for contracts" on public.contracts for all using (true) with check (true);
create policy "Enable all access for contract_contacts" on public.contract_contacts for all using (true) with check (true);
create policy "Enable all access for usage details" on public.consumer_usage_details for all using (true) with check (true);
