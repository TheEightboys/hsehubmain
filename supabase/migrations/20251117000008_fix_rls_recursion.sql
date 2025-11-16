-- ============================================
-- FIX RLS RECURSION ERROR
-- Run this in Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- 1. Drop problematic recursive policies on user_roles
-- ============================================
DROP POLICY IF EXISTS "user_roles_select_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_policy" ON public.user_roles;
DROP POLICY IF EXISTS "Companies can view their members" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- ============================================
-- 2. Create simple, non-recursive policies
-- ============================================
-- Allow authenticated users to view their own user_role records
CREATE POLICY "user_roles_view_own" ON public.user_roles
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow service role and authenticated users to insert their own records
CREATE POLICY "user_roles_insert_authenticated" ON public.user_roles
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Allow users to update their own records
CREATE POLICY "user_roles_update_authenticated" ON public.user_roles
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Allow users to delete their own records
CREATE POLICY "user_roles_delete_authenticated" ON public.user_roles
  FOR DELETE
  USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ============================================
-- 3. Fix companies table policies (remove user_roles references)
-- ============================================
DROP POLICY IF EXISTS "companies_select_members" ON public.companies;
DROP POLICY IF EXISTS "companies_update_admin" ON public.companies;
DROP POLICY IF EXISTS "companies_select_policy" ON public.companies;
DROP POLICY IF EXISTS "companies_update_policy" ON public.companies;

-- Simple policy: users can view companies they created
CREATE POLICY "companies_view_created" ON public.companies
  FOR SELECT
  USING (created_by = auth.uid() OR auth.role() = 'service_role');

-- Allow company creators to update their companies
CREATE POLICY "companies_update_creator" ON public.companies
  FOR UPDATE
  USING (created_by = auth.uid() OR auth.role() = 'service_role')
  WITH CHECK (created_by = auth.uid() OR auth.role() = 'service_role');

-- ============================================
-- 4. Update activity_groups policies to avoid recursion
-- ============================================
DROP POLICY IF EXISTS "activity_groups_select_policy" ON public.activity_groups;
DROP POLICY IF EXISTS "activity_groups_insert_policy" ON public.activity_groups;
DROP POLICY IF EXISTS "activity_groups_update_policy" ON public.activity_groups;
DROP POLICY IF EXISTS "activity_groups_delete_policy" ON public.activity_groups;

-- Simple company-based policies without user_roles lookup
CREATE POLICY "activity_groups_view_company" ON public.activity_groups
  FOR SELECT
  USING (
    company_id IN (SELECT id FROM public.companies WHERE created_by = auth.uid())
    OR auth.role() = 'service_role'
  );

CREATE POLICY "activity_groups_manage_company" ON public.activity_groups
  FOR ALL
  USING (
    company_id IN (SELECT id FROM public.companies WHERE created_by = auth.uid())
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    company_id IN (SELECT id FROM public.companies WHERE created_by = auth.uid())
    OR auth.role() = 'service_role'
  );

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('user_roles', 'companies', 'activity_groups')
ORDER BY tablename, policyname;
