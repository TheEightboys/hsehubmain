-- Create a function to set up company with admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_company_with_admin(
    p_company_name TEXT,
    p_user_email TEXT,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
    v_existing_company_id UUID;
    v_result JSON;
BEGIN
    -- Check if user already has a company
    SELECT company_id INTO v_existing_company_id
    FROM public.user_roles
    WHERE user_id = p_user_id
    LIMIT 1;
    
    IF v_existing_company_id IS NOT NULL THEN
        RAISE EXCEPTION 'User already has a company assigned';
    END IF;
    
    -- Create the company
    INSERT INTO public.companies (
        name,
        email,
        subscription_tier,
        subscription_status,
        max_employees,
        is_active
    )
    VALUES (
        p_company_name,
        p_user_email,
        'basic',
        'active',
        100,
        true
    )
    RETURNING id INTO v_company_id;
    
    -- Assign user as company admin
    INSERT INTO public.user_roles (
        user_id,
        role,
        company_id
    )
    VALUES (
        p_user_id,
        'company_admin',
        v_company_id
    );
    
    -- Return success with company ID
    v_result := json_build_object(
        'success', true,
        'company_id', v_company_id,
        'message', 'Company created successfully'
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating company: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_company_with_admin (TEXT, TEXT, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_company_with_admin IS 'Creates a company and assigns the user as company admin, bypassing RLS policies';