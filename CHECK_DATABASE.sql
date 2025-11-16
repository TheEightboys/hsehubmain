-- ============================================
-- DATABASE DIAGNOSTIC QUERIES
-- ============================================
-- Run these queries ONE BY ONE in Supabase SQL Editor to diagnose the issue

-- 1. CHECK IF USER EXISTS
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'barathanand2004@gmail.com';
-- Expected: 1 row with your user ID

-- 2. CHECK IF COMPANY EXISTS FOR THIS USER
SELECT id, name, company_email, created_at
FROM companies
WHERE company_email = 'barathanand2004@gmail.com'
OR created_by IN (SELECT id FROM auth.users WHERE email = 'barathanand2004@gmail.com');
-- Expected: At least 1 row with company details

-- 3. CHECK IF USER_ROLE EXISTS (THIS IS THE CRITICAL ONE!)
SELECT 
  ur.user_id,
  ur.company_id,
  ur.role,
  ur.created_at,
  au.email as user_email,
  c.name as company_name
FROM user_roles ur
LEFT JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN companies c ON c.id = ur.company_id
WHERE ur.user_id IN (SELECT id FROM auth.users WHERE email = 'barathanand2004@gmail.com');
-- Expected: 1 row linking your user to a company
-- If EMPTY: This is the problem! The registration didn't create the user_role entry

-- 4. CHECK ALL COMPANIES (to see what exists)
SELECT id, name, company_email, created_at, created_by
FROM companies
ORDER BY created_at DESC
LIMIT 10;

-- 5. CHECK ALL USER_ROLES (to see what links exist)
SELECT 
  ur.user_id,
  ur.company_id,
  ur.role,
  au.email,
  c.name as company_name
FROM user_roles ur
LEFT JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN companies c ON c.id = ur.company_id
ORDER BY ur.created_at DESC
LIMIT 10;

-- ============================================
-- IF USER_ROLE IS MISSING, RUN THIS FIX:
-- ============================================

-- First, find your user_id and company_id from queries 1 and 2 above
-- Then replace the UUIDs below and run:

-- INSERT INTO user_roles (user_id, company_id, role)
-- VALUES (
--   'YOUR_USER_ID_FROM_QUERY_1',
--   'YOUR_COMPANY_ID_FROM_QUERY_2', 
--   'company_admin'
-- );

-- After running the INSERT, go back to your app and click "Refresh Session"
