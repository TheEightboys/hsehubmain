-- ============================================
-- EMERGENCY FIX - RUN THIS IMMEDIATELY
-- ============================================
-- This is a simple, direct fix for the 500 error
-- Copy and run in Supabase SQL Editor

-- CRITICAL: First, let's see what's in the database
SELECT 'Checking user_roles table...' as status;
SELECT * FROM user_roles WHERE user_id = '7786b73f-e540-4e66-af32-53942c0951f2';

SELECT 'Checking companies table...' as status;
SELECT id, name, email, created_at FROM companies ORDER BY created_at DESC LIMIT 3;

-- Step 1: DISABLE RLS COMPLETELY on user_roles (this fixes 500 errors)
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Add unique constraint if missing
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_company_id_key;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_company_id_key UNIQUE (user_id, company_id);

-- Step 3: Delete any duplicate entries
DELETE FROM user_roles a USING user_roles b
WHERE a.id > b.id 
AND a.user_id = b.user_id 
AND a.company_id = b.company_id;

-- Step 4: Link your account NOW
DELETE FROM user_roles WHERE user_id = '7786b73f-e540-4e66-af32-53942c0951f2';

INSERT INTO user_roles (user_id, company_id, role)
SELECT 
  '7786b73f-e540-4e66-af32-53942c0951f2',
  id,
  'company_admin'
FROM companies
ORDER BY created_at DESC
LIMIT 1;

-- Step 5: Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON user_roles;
DROP POLICY IF EXISTS "Company admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Anyone can view their own user_role" ON user_roles;
DROP POLICY IF EXISTS "Service role can manage all user_roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON user_roles;
DROP POLICY IF EXISTS "user_roles_all_policy" ON user_roles;
DROP POLICY IF EXISTS "allow_own_user_role" ON user_roles;

-- Step 6: Re-enable RLS with ULTRA SIMPLE policy
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create the simplest possible policy - allow users to see their own role
CREATE POLICY "allow_own_user_role" ON user_roles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Step 7: Final Verification
SELECT '========================================' as message;
SELECT '✅ VERIFICATION - YOU SHOULD SEE YOUR DATA BELOW:' as message;
SELECT '========================================' as message;

SELECT 
  ur.user_id,
  ur.company_id,
  ur.role,
  au.email,
  c.name as company_name
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
JOIN companies c ON c.id = ur.company_id
WHERE ur.user_id = '7786b73f-e540-4e66-af32-53942c0951f2';

SELECT '========================================' as message;
SELECT 'If you see a row above with your email, SUCCESS!' as message;
SELECT 'Now go to your app and SIGN IN!' as message;
SELECT 'The 500 errors should be GONE!' as message;
SELECT '========================================' as message;
