
-- =========================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO UPDATE SCHEMA
-- =========================================================

-- 1. Add missing columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Create a secure function to check admin status (Generic, no hardcoding)
-- This function runs with "security definer" privileges to bypass RLS recursion loops
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Optimize Policies (Drop old ones first to avoid conflicts)
DROP POLICY IF EXISTS "Read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update anything" ON public.profiles;
DROP POLICY IF EXISTS "Insert profile" ON public.profiles;

-- READ: Users can read their own profile OR Admins can read everyone
CREATE POLICY "Read profiles" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR is_admin()
);

-- INSERT: Authenticated users can insert their own profile (SignUp flow)
CREATE POLICY "Insert profile" ON public.profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- UPDATE: Users can update their own data
CREATE POLICY "Update own profile" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id
);

-- UPDATE (ADMIN): Admins can update all profiles
CREATE POLICY "Admins can update all" ON public.profiles
FOR UPDATE USING (
  is_admin()
);
