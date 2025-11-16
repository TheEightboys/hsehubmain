-- ============================================
-- FORCE FIX ALL RLS POLICIES - Drop Everything and Rebuild
-- Run this in Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- 1. DROP ALL POLICIES ON user_roles
-- ============================================
DROP POLICY IF EXISTS "Super admins can insert any roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update any roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "allow_own_user_role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_authenticated" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_authenticated" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_authenticated" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_view_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_policy" ON public.user_roles;
DROP POLICY IF EXISTS "Companies can view their members" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Drop any remaining policies using a dynamic query
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_roles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', r.policyname);
    END LOOP;
END $$;

-- ============================================
-- 2. CREATE ONLY SIMPLE, NON-RECURSIVE POLICIES FOR user_roles
-- ============================================

-- Allow users to view their own role records
CREATE POLICY "view_own_role" ON public.user_roles
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow service role to do everything (for RPCs and admin operations)
CREATE POLICY "service_role_all" ON public.user_roles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to insert their own records
CREATE POLICY "insert_own_role" ON public.user_roles
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. DROP ALL POLICIES ON companies
-- ============================================
DROP POLICY IF EXISTS "companies_select_members" ON public.companies;
DROP POLICY IF EXISTS "companies_update_admin" ON public.companies;
DROP POLICY IF EXISTS "companies_select_policy" ON public.companies;
DROP POLICY IF EXISTS "companies_update_policy" ON public.companies;
DROP POLICY IF EXISTS "companies_view_created" ON public.companies;
DROP POLICY IF EXISTS "companies_update_creator" ON public.companies;

-- Drop any remaining policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'companies'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.companies', r.policyname);
    END LOOP;
END $$;

-- ============================================
-- 4. CREATE SIMPLE POLICIES FOR companies (NO user_roles lookups)
-- ============================================

-- Users can view companies they created
CREATE POLICY "view_own_company" ON public.companies
  FOR SELECT
  USING (created_by = auth.uid());

-- Users can update companies they created
CREATE POLICY "update_own_company" ON public.companies
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Service role can do everything
CREATE POLICY "companies_service_role" ON public.companies
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- 5. DROP ALL POLICIES ON activity_groups
-- ============================================
DROP POLICY IF EXISTS "activity_groups_select_policy" ON public.activity_groups;
DROP POLICY IF EXISTS "activity_groups_insert_policy" ON public.activity_groups;
DROP POLICY IF EXISTS "activity_groups_update_policy" ON public.activity_groups;
DROP POLICY IF EXISTS "activity_groups_delete_policy" ON public.activity_groups;
DROP POLICY IF EXISTS "activity_groups_view_company" ON public.activity_groups;
DROP POLICY IF EXISTS "activity_groups_manage_company" ON public.activity_groups;

-- Drop any remaining policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_groups'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.activity_groups', r.policyname);
    END LOOP;
END $$;

-- ============================================
-- 6. CREATE SIMPLE POLICIES FOR activity_groups (NO recursive lookups)
-- ============================================

-- Users can view activity groups for their companies (direct created_by check)
CREATE POLICY "view_company_activity_groups" ON public.activity_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.companies 
      WHERE companies.id = activity_groups.company_id 
      AND companies.created_by = auth.uid()
    )
  );

-- Users can insert activity groups for their companies
CREATE POLICY "insert_company_activity_groups" ON public.activity_groups
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies 
      WHERE companies.id = activity_groups.company_id 
      AND companies.created_by = auth.uid()
    )
  );

-- Users can update activity groups for their companies
CREATE POLICY "update_company_activity_groups" ON public.activity_groups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.companies 
      WHERE companies.id = activity_groups.company_id 
      AND companies.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies 
      WHERE companies.id = activity_groups.company_id 
      AND companies.created_by = auth.uid()
    )
  );

-- Users can delete activity groups for their companies
CREATE POLICY "delete_company_activity_groups" ON public.activity_groups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.companies 
      WHERE companies.id = activity_groups.company_id 
      AND companies.created_by = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "activity_groups_service_role" ON public.activity_groups
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;

-- ============================================
-- VERIFICATION - Check final policies
-- ============================================
SELECT 
  'user_roles' as table_name,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'user_roles'
UNION ALL
SELECT 
  'companies' as table_name,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'companies'
UNION ALL
SELECT 
  'activity_groups' as table_name,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'activity_groups'
ORDER BY table_name, policyname;
