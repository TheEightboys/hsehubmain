-- Run this in Supabase SQL Editor to set up your user with a company
-- Replace 'YOUR_USER_EMAIL' with your actual email address

-- Step 1: Find your user ID
SELECT id, email FROM auth.users WHERE email = 'YOUR_USER_EMAIL';

-- Step 2: Check if you have a company assigned
SELECT *
FROM user_roles
WHERE
    user_id = (
        SELECT id
        FROM auth.users
        WHERE
            email = 'YOUR_USER_EMAIL'
    );

-- Step 3: If no company exists, create one
INSERT INTO
    companies (
        name,
        email,
        subscription_tier,
        subscription_status,
        max_employees
    )
VALUES (
        'My Company',
        'YOUR_USER_EMAIL',
        'basic',
        'active',
        25
    ) RETURNING id;

-- Step 4: Assign user to the company (replace COMPANY_ID and USER_ID with actual values from steps 1 and 3)
-- Example:
-- INSERT INTO user_roles (user_id, role, company_id)
-- VALUES ('USER_ID_FROM_STEP_1', 'company_admin', 'COMPANY_ID_FROM_STEP_3');

-- Or run this all-in-one query (RECOMMENDED):
DO $$
DECLARE
    v_user_id UUID;
    v_company_id UUID;
    v_email TEXT := 'YOUR_USER_EMAIL'; -- CHANGE THIS TO YOUR EMAIL
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found with email: %', v_email;
    END IF;
    
    -- Check if user already has a company
    SELECT company_id INTO v_company_id FROM user_roles WHERE user_id = v_user_id LIMIT 1;
    
    IF v_company_id IS NULL THEN
        -- Create a new company
        INSERT INTO companies (name, email, subscription_tier, subscription_status, max_employees)
        VALUES ('My Company', v_email, 'basic', 'active', 100)
        RETURNING id INTO v_company_id;
        
        RAISE NOTICE 'Created company with ID: %', v_company_id;
        
        -- Assign user as company admin
        INSERT INTO user_roles (user_id, role, company_id)
        VALUES (v_user_id, 'company_admin', v_company_id);
        
        RAISE NOTICE 'Assigned user as company_admin';
    ELSE
        RAISE NOTICE 'User already has company ID: %', v_company_id;
    END IF;
END $$;