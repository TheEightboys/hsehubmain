-- ============================================
-- AUTO-FIX MISSING USER_ROLES
-- ============================================
-- This function automatically links users to companies if the link is missing
-- Run this migration to enable auto-fix on login

CREATE OR REPLACE FUNCTION public.auto_link_user_to_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$   
DECLARE
  v_company_id UUID;
BEGIN
  -- Check if user already has a role
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Find if this user created any companies
  SELECT id INTO v_company_id
  FROM companies
  WHERE created_by = NEW.id
  OR company_email = NEW.email
  ORDER BY created_at DESC
  LIMIT 1;

  -- If company found, create the user_role link
  IF v_company_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, company_id, role)
    VALUES (NEW.id, v_company_id, 'company_admin')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Auto-linked user % to company %', NEW.email, v_company_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger that runs after user signs in
DROP TRIGGER IF EXISTS auto_link_on_auth ON auth.users;
CREATE TRIGGER auto_link_on_auth
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION auto_link_user_to_company();

-- Also create a function users can call manually
CREATE OR REPLACE FUNCTION public.fix_my_company_link()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if already linked
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id) THEN
    SELECT jsonb_build_object(
      'success', true,
      'message', 'Already linked',
      'company_id', company_id,
      'role', role
    ) INTO v_result
    FROM user_roles
    WHERE user_id = v_user_id
    LIMIT 1;
    RETURN v_result;
  END IF;

  -- Find company for this user
  SELECT id INTO v_company_id
  FROM companies
  WHERE created_by = v_user_id
  OR company_email = (SELECT email FROM auth.users WHERE id = v_user_id)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No company found for your account',
      'message', 'Please create a company first'
    );
  END IF;

  -- Create the link
  INSERT INTO user_roles (user_id, company_id, role)
  VALUES (v_user_id, v_company_id, 'company_admin')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Company link created successfully',
    'company_id', v_company_id,
    'role', 'company_admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fix_my_company_link() TO authenticated;

COMMENT ON FUNCTION public.fix_my_company_link IS 'Manually fix missing company link for current user';
COMMENT ON FUNCTION public.auto_link_user_to_company IS 'Automatically links users to companies on sign-in';