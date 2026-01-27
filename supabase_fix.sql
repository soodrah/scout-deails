
-- =========================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX INFINITE RECURSION
-- =========================================================

-- 1. Create a secure function to check admin status
-- This function runs with "security definer" privileges, bypassing RLS to avoid the loop.
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

-- 2. Clean up existing problematic policies
DROP POLICY IF EXISTS "Read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update anything" ON public.profiles;
DROP POLICY IF EXISTS "Insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;

-- 3. Re-create Optimized Policies

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

-- UPDATE (ADMIN): Admins can update any profile (to promote users, add points)
CREATE POLICY "Admins can update all" ON public.profiles
FOR UPDATE USING (
  is_admin()
);

-- 4. Ensure Super Admin Access (Idempotent)
-- This ensures your specific email definitely has the admin role
UPDATE public.profiles 
SET role = 'admin', points = 999 
WHERE email = 'soodrah@gmail.com';
