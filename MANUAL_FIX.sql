-- ============================================
-- EMERGENCY FIX - LINK USER TO COMPANY
-- ============================================
-- Run this if you created a company but it's not linked to your user

-- STEP 1: Find your user ID
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'barathanand2004@gmail.com';

-- Copy the user_id from above (looks like: 7786b73f-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

-- STEP 2: Find your company ID
SELECT 
  id as company_id,
  name as company_name,
  email as company_email,
  created_at
FROM companies
ORDER BY created_at DESC
LIMIT 5;

-- Copy the company_id of YOUR company from above

-- STEP 3: Check if user_role already exists
SELECT *
FROM user_roles
WHERE user_id = '7786b73f-YOUR-FULL-UUID-HERE';

-- If the above returns EMPTY, that's the problem!

-- STEP 4: MANUAL FIX - Create the user_role link
-- Replace the UUIDs below with your actual IDs from steps 1 and 2

INSERT INTO user_roles (user_id, company_id, role)
VALUES (
  '7786b73f-YOUR-FULL-USER-ID-HERE',  -- Your user ID from STEP 1
  'YOUR-COMPANY-ID-HERE',              -- Your company ID from STEP 2
  'company_admin'                      -- Your role
)
ON CONFLICT (user_id, company_id) DO NOTHING;

-- STEP 5: Verify it worked
SELECT 
  ur.user_id,
  ur.company_id,
  ur.role,
  au.email,
  c.name as company_name
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
JOIN companies c ON c.id = ur.company_id
WHERE au.email = 'barathanand2004@gmail.com';

-- Expected: 1 row showing your user linked to your company

-- STEP 6: Go back to your app and click "Refresh Session" button
-- Your company should load immediately!
