
-- 1. Create Contracts Table
-- Stores the commercial terms.
create table public.contracts (
  id uuid default gen_random_uuid() primary key,
  business_id uuid references public.businesses(id) on delete cascade not null,
  restaurant_name text not null,
  commission_percentage numeric default 0, -- e.g., 2.0 for 2%
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Contacts Table (Reusable People Data)
-- This stores the actual person's details, independent of any specific contract.
create table public.contacts (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- "Owner Name" goes here now
  phone_number text,
  street_address text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Contract Assignments (Intermediate Junction Table)
-- Enables Many-to-Many: One contract can have many contacts, One person can have many contracts.
create table public.contract_assignments (
  id uuid default gen_random_uuid() primary key,
  contract_id uuid references public.contracts(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  role text default 'owner', -- e.g. 'owner', 'manager', 'billing'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create Consumer Usage Details Table
-- Tracks redemptions and money owed.
create table public.consumer_usage_details (
  id uuid default gen_random_uuid() primary key,
  deal_id uuid references public.deals(id) on delete set null,
  consumer_email text,
  details_of_deal text,
  date_of_deal timestamp with time zone default timezone('utc'::text, now()) not null,
  commission_due numeric default 0,
  date_commission_was_paid timestamp with time zone,
  amount_received numeric default 0
);

-- 5. Enable Row Level Security (RLS)
alter table public.contracts enable row level security;
alter table public.contacts enable row level security;
alter table public.contract_assignments enable row level security;
alter table public.consumer_usage_details enable row level security;

-- 6. Create Basic Policies
create policy "Enable all access for contracts" on public.contracts for all using (true) with check (true);
create policy "Enable all access for contacts" on public.contacts for all using (true) with check (true);
create policy "Enable all access for assignments" on public.contract_assignments for all using (true) with check (true);
create policy "Enable all access for usage details" on public.consumer_usage_details for all using (true) with check (true);
