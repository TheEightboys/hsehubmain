-- ============================================
-- EMERGENCY COMPANY FIX
-- Run this in Supabase SQL Editor to fix company_id null issues
-- ============================================

BEGIN;

-- ============================================
-- 1. Ensure companies table has created_by column
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.companies ADD COLUMN created_by UUID REFERENCES auth.users(id);
    RAISE NOTICE 'Added created_by column to companies';
  END IF;
END $$;

-- ============================================
-- 2. Ensure user_roles table exists and has proper structure
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('super_admin', 'company_admin', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, company_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON public.user_roles(company_id);

-- ============================================
-- 3. Enable RLS on user_roles and set permissive policies
-- ============================================
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_own" ON public.user_roles;

CREATE POLICY "user_roles_select_all" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_roles_insert_own" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_roles_update_own" ON public.user_roles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. Enable RLS on companies with permissive creation
-- ============================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_insert_authenticated" ON public.companies;
DROP POLICY IF EXISTS "companies_select_members" ON public.companies;
DROP POLICY IF EXISTS "companies_update_admin" ON public.companies;

-- Allow any authenticated user to create a company
CREATE POLICY "companies_insert_authenticated" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view companies they're linked to
CREATE POLICY "companies_select_members" ON public.companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

-- Allow company admins to update their company
CREATE POLICY "companies_update_admin" ON public.companies
  FOR UPDATE USING (
    id IN (
      SELECT company_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'company_admin'
    )
  );

-- ============================================
-- 5. Create helper RPC: get_company_context
-- ============================================
-- Drop existing function first if it exists with different return type
DROP FUNCTION IF EXISTS public.get_company_context();

CREATE OR REPLACE FUNCTION public.get_company_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_company_id UUID;
  v_role TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Get user's company and role
  SELECT company_id, role INTO v_company_id, v_role
  FROM public.user_roles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_company_id IS NULL THEN
    -- Try to auto-link if user created a company
    SELECT id INTO v_company_id
    FROM public.companies
    WHERE created_by = v_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_company_id IS NOT NULL THEN
      -- Auto-create link
      INSERT INTO public.user_roles (user_id, company_id, role)
      VALUES (v_user_id, v_company_id, 'company_admin')
      ON CONFLICT (user_id, company_id) DO NOTHING;
      
      v_role := 'company_admin';
    END IF;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'no_company_linked');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'company_id', v_company_id,
    'role', v_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_context() TO authenticated;

-- ============================================
-- 6. Create helper RPC: create_company_with_admin
-- ============================================
-- Drop existing function first if it exists with different return type
DROP FUNCTION IF EXISTS public.create_company_with_admin(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.create_company_with_admin(
  p_company_name TEXT,
  p_user_email TEXT,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_existing_company_id UUID;
BEGIN
  -- Check if user already has a company
  SELECT company_id INTO v_existing_company_id
  FROM public.user_roles
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_existing_company_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already has a company',
      'company_id', v_existing_company_id
    );
  END IF;

  -- Create company
  INSERT INTO public.companies (name, email, created_by)
  VALUES (p_company_name, p_user_email, p_user_id)
  RETURNING id INTO v_company_id;

  -- Link user as company_admin
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (p_user_id, v_company_id, 'company_admin');

  RETURN jsonb_build_object(
    'success', true,
    'company_id', v_company_id,
    'message', 'Company created successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_company_with_admin(TEXT, TEXT, UUID) TO authenticated;

-- ============================================
-- 7. Fix any orphaned companies (link creator to their company)
-- ============================================
DO $$
DECLARE
  v_company RECORD;
BEGIN
  FOR v_company IN (
    SELECT c.id as company_id, c.created_by
    FROM public.companies c
    WHERE c.created_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = c.created_by AND ur.company_id = c.id
    )
  )
  LOOP
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (v_company.created_by, v_company.company_id, 'company_admin')
    ON CONFLICT (user_id, company_id) DO NOTHING;
    
    RAISE NOTICE 'Linked user % to company %', v_company.created_by, v_company.company_id;
  END LOOP;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 
  'user_roles' as table_name,
  COUNT(*) as record_count
FROM public.user_roles
UNION ALL
SELECT 
  'companies' as table_name,
  COUNT(*) as record_count
FROM public.companies;

-- Check your specific user
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'barathanand2004@gmail.com'; -- Change to your email
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'User has % company links', (
      SELECT COUNT(*) FROM public.user_roles WHERE user_id = v_user_id
    );
  ELSE
    RAISE NOTICE 'User with email % not found', v_email;
  END IF;
END $$;
