
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

-- 7. RBAC (Role Based Access Control) Updates for Profiles
-- Add role column if it doesn't exist (assuming profiles table exists from previous migrations, if not create it)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  points integer default 0,
  role text default 'consumer' check (role in ('consumer', 'admin')),
  updated_at timestamp with time zone
);

-- Seed the Owner (You) as Admin
-- This updates the role only if the user already exists in auth.users
update public.profiles 
set role = 'admin' 
where email = 'soodrah@gmail.com';

-- Security Policy: Only Admins can update roles
-- We need to enable RLS on profiles if not already done
alter table public.profiles enable row level security;

-- Allow users to read their own profile OR if the requester is an admin
create policy "Read profiles" on public.profiles
  for select using (
    auth.uid() = id OR 
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Allow users to update their own basic info (but NOT role)
create policy "Update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (
     -- Start Condition: Updating own record
     auth.uid() = id 
     -- Constraint: Role must remain unchanged
     AND (role = (select role from public.profiles where id = auth.uid()))
  );

-- Allow Admins to update ANY profile (including changing roles)
create policy "Admins can update anything" on public.profiles
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
