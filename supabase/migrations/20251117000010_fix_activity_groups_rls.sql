-- ============================================
-- FIX ACTIVITY GROUPS RLS - Allow inserts properly
-- Run this in Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- 1. Ensure created_by column exists on companies table
-- ============================================

-- Add created_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'companies' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.companies ADD COLUMN created_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Update any companies that don't have created_by set
UPDATE public.companies
SET created_by = (
  SELECT user_id 
  FROM public.user_roles 
  WHERE user_roles.company_id = companies.id 
  AND user_roles.role = 'company_admin'
  LIMIT 1
)
WHERE created_by IS NULL;

-- ============================================
-- 2. Drop existing activity_groups policies
-- ============================================
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
-- 3. Create NEW working policies for activity_groups
-- ============================================

-- Policy 1: Users can view activity groups from companies they have access to
CREATE POLICY "activity_groups_select" ON public.activity_groups
  FOR SELECT
  USING (
    -- Check if user is linked to this company via user_roles
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    -- OR check if user created the company
    company_id IN (
      SELECT id FROM public.companies WHERE created_by = auth.uid()
    )
  );

-- Policy 2: Users can insert activity groups for companies they're linked to
CREATE POLICY "activity_groups_insert" ON public.activity_groups
  FOR INSERT
  WITH CHECK (
    -- Check if user is linked to this company via user_roles
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    -- OR check if user created the company
    company_id IN (
      SELECT id FROM public.companies WHERE created_by = auth.uid()
    )
  );

-- Policy 3: Users can update activity groups for their companies
CREATE POLICY "activity_groups_update" ON public.activity_groups
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM public.companies WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM public.companies WHERE created_by = auth.uid()
    )
  );

-- Policy 4: Users can delete activity groups for their companies
CREATE POLICY "activity_groups_delete" ON public.activity_groups
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM public.companies WHERE created_by = auth.uid()
    )
  );

-- ============================================
-- 4. Fix exposure_groups table RLS (same pattern)
-- ============================================

-- Drop existing exposure_groups policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'exposure_groups'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.exposure_groups', r.policyname);
    END LOOP;
END $$;

-- Create policies for exposure_groups
CREATE POLICY "exposure_groups_select" ON public.exposure_groups
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM public.companies WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "exposure_groups_insert" ON public.exposure_groups
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM public.companies WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "exposure_groups_update" ON public.exposure_groups
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM public.companies WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM public.companies WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "exposure_groups_delete" ON public.exposure_groups
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT id FROM public.companies WHERE created_by = auth.uid()
    )
  );

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check your user_roles
SELECT 'Your user_roles entries:' as info;
SELECT user_id, company_id, role FROM public.user_roles WHERE user_id = auth.uid();

-- Check companies you have access to
SELECT 'Companies you have access to:' as info;
SELECT id, name, created_by FROM public.companies 
WHERE id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
   OR created_by = auth.uid();

-- Check policies
SELECT 'Activity Groups Policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'activity_groups';

SELECT 'Exposure Groups Policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'exposure_groups';
