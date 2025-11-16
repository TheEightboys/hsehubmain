-- =====================================================================================
-- CREATE REGISTRATION FUNCTION - Handle complete company registration
-- =====================================================================================
-- This function handles the entire registration process in one transaction
-- It bypasses RLS by using SECURITY DEFINER with the function owner's privileges

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.register_company(jsonb);

-- Create the registration function
CREATE OR REPLACE FUNCTION public.register_company(
  registration_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Run with function owner's privileges, bypassing RLS
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id uuid;
  v_company_data jsonb;
  v_result jsonb;
BEGIN
  -- Extract user_id from the registration data
  v_user_id := (registration_data->>'user_id')::uuid;
  
  -- Validate required fields
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id is required';
  END IF;
  
  IF registration_data->>'company_name' IS NULL THEN
    RAISE EXCEPTION 'company_name is required';
  END IF;

  -- Validate that user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User with id % does not exist in auth.users. Please ensure user is created first.', v_user_id;
  END IF;

  -- Step 1: Create the company
  INSERT INTO companies (
    name,
    email,
    phone,
    address,
    subscription_tier,
    subscription_status,
    max_employees,
    subscription_start_date,
    subscription_end_date
  )
  VALUES (
    registration_data->>'company_name',
    registration_data->>'company_email',
    registration_data->>'company_phone',
    registration_data->>'company_address',
    COALESCE((registration_data->>'subscription_tier')::subscription_tier, 'basic'::subscription_tier),
    'trial'::subscription_status,
    COALESCE((registration_data->>'max_employees')::integer, 10),
    NOW(),
    NOW() + INTERVAL '30 days'
  )
  RETURNING id INTO v_company_id;

  -- Step 2: Assign company_admin role
  INSERT INTO user_roles (
    user_id,
    role,
    company_id
  )
  VALUES (
    v_user_id,
    'company_admin',
    v_company_id
  );

  -- Step 3: Create or update profile
  INSERT INTO profiles (
    id,
    email,
    full_name
  )
  VALUES (
    v_user_id,
    registration_data->>'admin_email',
    registration_data->>'admin_name'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

  -- Step 4: Get company data for return
  SELECT to_jsonb(c.*) INTO v_company_data
  FROM companies c
  WHERE c.id = v_company_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'company_id', v_company_id,
    'company', v_company_data,
    'message', 'Company registered successfully'
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.register_company(jsonb) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.register_company IS 
  'Handles complete company registration including company creation, role assignment, and profile creation. Bypasses RLS using SECURITY DEFINER.';

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Registration function created successfully!';
  RAISE NOTICE '📝 Function: public.register_company(jsonb)';
  RAISE NOTICE '🔐 Security: DEFINER (bypasses RLS)';
  RAISE NOTICE '👥 Permissions: Granted to authenticated users';
  RAISE NOTICE '';
  RAISE NOTICE '📖 Usage:';
  RAISE NOTICE '   SELECT register_company(jsonb_build_object(';
  RAISE NOTICE '     ''user_id'', auth.uid(),';
  RAISE NOTICE '     ''company_name'', ''Acme Corp'',';
  RAISE NOTICE '     ''company_email'', ''info@acme.com'',';
  RAISE NOTICE '     ''admin_email'', ''admin@acme.com'',';
  RAISE NOTICE '     ''admin_name'', ''John Doe'',';
  RAISE NOTICE '     ''subscription_tier'', ''standard''';
  RAISE NOTICE '   ));';
END $$;
