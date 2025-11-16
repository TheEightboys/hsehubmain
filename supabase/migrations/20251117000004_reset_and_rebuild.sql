-- ============================================
-- 20251117000004_RESET_AND_REBUILD.SQL
-- Consolidated safe fix to restore auth & user_roles access
-- Run this ONCE in Supabase SQL Editor. Non-destructive where possible.
-- ============================================

-- PREAMBLE: This script will:
-- 1) Remove problematic triggers/functions on auth.users that may cause loops
-- 2) Ensure the user_roles table has a unique constraint and no duplicates
-- 3) Create a robust `fix_my_company_link()` function (SECURITY DEFINER)
-- 4) Create safe, minimal RLS policies for `user_roles`, `companies`, and `profiles`
-- 5) Provide verification queries at the end

BEGIN;

-- ============================================
-- 1) DROP problematic triggers & functions (safe - IF EXISTS)
-- ============================================

-- Drop trigger on auth.users that auto-linked users (may cause loops)
DROP TRIGGER IF EXISTS auto_link_on_auth ON auth.users;

-- Drop the auto_link function if it exists (we'll recreate a safe one)
DROP FUNCTION IF EXISTS public.auto_link_user_to_company() CASCADE;

-- Drop older fix_my_company_link if broken; we'll recreate
DROP FUNCTION IF EXISTS public.fix_my_company_link() CASCADE;

-- ============================================
-- 2) Ensure user_roles constraints + dedupe
-- ============================================

-- Add unique constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_company_id_key'
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_company_id_key UNIQUE (user_id, company_id);
    RAISE NOTICE 'Added unique constraint user_roles_user_id_company_id_key';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END$$;

-- Remove exact duplicates keeping the smallest id (if table has id)
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_roles' AND column_name='id') THEN
    FOR r IN (
      SELECT user_id, company_id, (array_agg(id ORDER BY id))[1] as keep_id
      FROM public.user_roles
      GROUP BY user_id, company_id
      HAVING COUNT(*) > 1
    ) LOOP
      DELETE FROM public.user_roles
      WHERE user_id = r.user_id
      AND company_id = r.company_id
      AND id <> r.keep_id;
    END LOOP;
    RAISE NOTICE 'Removed duplicate user_roles rows (if any)';
  ELSE
    -- No id column, attempt to dedupe by ctid (best-effort)
    WITH duplicates AS (
      SELECT ctid, user_id, company_id,
        ROW_NUMBER() OVER (PARTITION BY user_id, company_id ORDER BY (SELECT 1)) as rn
      FROM public.user_roles
    )
    DELETE FROM public.user_roles
    WHERE ctid IN (SELECT ctid FROM duplicates WHERE rn > 1);
    RAISE NOTICE 'Dedupe by ctid executed (if needed)';
  END IF;
END$$;

-- ============================================
-- 3) Ensure companies table has created_by column
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN created_by UUID REFERENCES auth.users(id);
    RAISE NOTICE 'Added companies.created_by column';
  ELSE
    RAISE NOTICE 'companies.created_by already exists';
  END IF;
END$$;

-- ============================================
-- 4) Create safe fix_my_company_link() RPC function
--    - SECURITY DEFINER
--    - Does minimal, well-checked inserts
-- ============================================

CREATE OR REPLACE FUNCTION public.fix_my_company_link()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_company_id UUID;
  v_existing RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Find email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- If already linked, return existing row
  SELECT company_id, role INTO v_existing
  FROM public.user_roles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'already_linked', 'company_id', v_existing.company_id, 'role', v_existing.role);
  END IF;

  -- Try to find company created by this user
  SELECT id INTO v_company_id FROM public.companies WHERE created_by = v_user_id ORDER BY created_at DESC LIMIT 1;

  -- If not found, try match by email columns (both company email or companies.email)
  IF v_company_id IS NULL AND v_user_email IS NOT NULL THEN
    SELECT id INTO v_company_id FROM public.companies WHERE email = v_user_email ORDER BY created_at DESC LIMIT 1;
  END IF;

  -- As last resort, pick the most recent company (use carefully)
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_company_found');
  END IF;

  -- Insert safely; unique constraint prevents duplicates
  BEGIN
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (v_user_id, v_company_id, 'company_admin');
  EXCEPTION WHEN unique_violation THEN
    -- someone else created the link concurrently
    NULL;
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  RETURN jsonb_build_object('success', true, 'message', 'linked', 'company_id', v_company_id, 'role', 'company_admin');
END;
$$;

GRANT EXECUTE ON FUNCTION public.fix_my_company_link() TO authenticated;

-- ============================================
-- 5) RLS: Minimal safe policies
--    - user_roles: allow authenticated to manage their own rows
--    - companies: allow authenticated to create companies; allow access only to company members
--    - profiles: allow users to manage their own profile
-- ============================================

-- user_roles policies
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_roles_select_policy ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert_policy ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update_policy ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete_policy ON public.user_roles;

CREATE POLICY user_roles_select_policy ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_roles_insert_policy ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_roles_update_policy ON public.user_roles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_roles_delete_policy ON public.user_roles FOR DELETE
  USING (auth.uid() = user_id);

-- companies policies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companies_insert_policy ON public.companies;
DROP POLICY IF EXISTS companies_select_policy ON public.companies;
DROP POLICY IF EXISTS companies_update_policy ON public.companies;

CREATE POLICY companies_insert_policy ON public.companies FOR INSERT
  WITH CHECK (true); -- allow authenticated creation

CREATE POLICY companies_select_policy ON public.companies FOR SELECT
  USING (
    id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

CREATE POLICY companies_update_policy ON public.companies FOR UPDATE
  USING (
    id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'company_admin')
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  )
  WITH CHECK (
    id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'company_admin')
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin')
  );

-- profiles policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_policy ON public.profiles;
CREATE POLICY profiles_policy ON public.profiles FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- 6) Final: Manual link for the current user (best-effort) - non-destructive
-- (This will link the specific user id if present in auth.users)
-- ============================================
DO $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'barathanand2004@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User with email not found; skipping manual link.';
    RETURN;
  END IF;

  -- find candidate company
  SELECT id INTO v_company_id FROM public.companies WHERE created_by = v_user_id ORDER BY created_at DESC LIMIT 1;
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE NOTICE 'No company found to link; skipping manual link.';
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (v_user_id, v_company_id, 'company_admin');
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Manual link already existed';
  END;

  RAISE NOTICE 'Manual link attempted for user % to company %', v_user_id, v_company_id;
END$$;

-- ============================================
-- 7) Verification queries (run and inspect results below)
-- ============================================

-- list user_roles for the current user
SELECT * FROM public.user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'barathanand2004@gmail.com');

-- check companies
SELECT id, name, email, created_by FROM public.companies ORDER BY created_at DESC LIMIT 5;

-- test RPC
SELECT public.fix_my_company_link();

COMMIT;

-- DONE

/*
Next steps after running:
1) In the Supabase SQL Editor Results, verify the `user_roles` SELECT returned a row with your email/company.
2) In your app: sign out and sign back in. If still getting 500 errors, copy the full error message and paste here.
3) If successful, we can optionally remove backup files or keep them for auditing.
*/