-- ============================================
-- ADMIN: Link user to a company by email (one-off)
-- Run this in Supabase SQL Editor (runs as postgres role)
-- Purpose: when you run functions that use auth.uid() from the SQL editor
-- the function sees auth.uid() = NULL (not authenticated). Use this admin
-- helper to link a user by email from the SQL editor.
-- ============================================

BEGIN;

-- Create an admin helper function (SECURITY DEFINER) that links a user by email
CREATE OR REPLACE FUNCTION public.admin_link_user_by_email(
  p_email TEXT,
  p_role TEXT DEFAULT 'company_admin'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
BEGIN
  -- Find user id from auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  -- Prefer company created by this user
  SELECT id INTO v_company_id FROM public.companies WHERE created_by = v_user_id ORDER BY created_at DESC LIMIT 1;

  -- If not found, try match by email on companies table
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM public.companies WHERE email = p_email ORDER BY created_at DESC LIMIT 1;
  END IF;

  -- If still not found, pick the most recent company as a last resort
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_company_found');
  END IF;

  -- Insert user_roles safely
  BEGIN
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (v_user_id, v_company_id, p_role::app_role);
  EXCEPTION WHEN unique_violation THEN
    -- already linked
    NULL;
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;

  RETURN jsonb_build_object('success', true, 'message', 'linked', 'user_id', v_user_id, 'company_id', v_company_id, 'role', p_role);
END;
$$;

-- Run the helper for your email (change email if needed)
SELECT public.admin_link_user_by_email('barathanand2004@gmail.com');

COMMIT;

-- After running:
-- 1) Inspect the Results panel for the JSON (success:true) and the user_roles row(s).
-- 2) In your app: sign out and sign in again.
-- 3) If you still see 500 errors, copy the network error response and paste it to me.
