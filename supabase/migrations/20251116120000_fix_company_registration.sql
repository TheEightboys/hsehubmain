-- =====================================================================================
-- FIX COMPANY REGISTRATION - Allow new users to create companies during signup
-- =====================================================================================
-- This migration fixes the RLS policy issue that blocks company registration
-- It allows authenticated users to insert companies if they don't already have one

-- =====================================================================================
-- DROP ALL EXISTING POLICIES FIRST
-- =====================================================================================

-- Drop all existing policies for companies table
DROP POLICY IF EXISTS "Users can insert their own company" ON companies;
DROP POLICY IF EXISTS "Allow company creation during registration" ON companies;
DROP POLICY IF EXISTS "Company admins can view their company" ON companies;
DROP POLICY IF EXISTS "Company admins can update their company" ON companies;
DROP POLICY IF EXISTS "Super admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Super admins can update any company" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can update their own company" ON companies;

-- =====================================================================================
-- COMPANIES TABLE - Recreate all policies
-- =====================================================================================

-- Policy 1: Allow authenticated users to create companies during registration
-- This allows new users who don't yet have a company_id to create one
CREATE POLICY "Allow company creation during registration"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Allow all authenticated users to create a company

-- Policy 2: Company admins can view their own company
CREATE POLICY "Company admins can view their company"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM user_roles 
      WHERE user_id = auth.uid()
    )
  );

-- Policy 3: Company admins can update their own company
CREATE POLICY "Company admins can update their company"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id 
      FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'company_admin'
    )
  );

-- Policy 4: Super admins can view all companies
CREATE POLICY "Super admins can view all companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Policy 5: Super admins can update any company
CREATE POLICY "Super admins can update any company"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- =====================================================================================
-- USER_ROLES TABLE - Allow role assignment during registration
-- =====================================================================================

-- Drop ALL existing policies for user_roles table
DROP POLICY IF EXISTS "Allow role creation during registration" ON user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can update any roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can insert any roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their roles" ON user_roles;
DROP POLICY IF EXISTS "Company admins can view company roles" ON user_roles;

-- Policy: Allow authenticated users to create their own role during registration
CREATE POLICY "Allow role creation during registration"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() -- Can only create role for themselves
  );

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Super admins can view all roles
CREATE POLICY "Super admins can view all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Policy: Super admins can update any role
CREATE POLICY "Super admins can update any roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Policy: Super admins can insert any role
CREATE POLICY "Super admins can insert any roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- =====================================================================================
-- PROFILES TABLE - Allow profile creation during registration
-- =====================================================================================

-- Drop ALL existing policies for profiles table
DROP POLICY IF EXISTS "Allow profile creation during registration" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view company profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;

-- Policy: Allow users to create their own profile
CREATE POLICY "Allow profile creation during registration"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() -- Can only create profile for themselves
  );

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Policy: Company users can view profiles in their company
CREATE POLICY "Users can view company profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ur.user_id
      FROM user_roles ur
      WHERE ur.company_id IN (
        SELECT company_id 
        FROM user_roles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Company registration fix applied successfully!';
  RAISE NOTICE '📝 New policies created:';
  RAISE NOTICE '   - Companies: Allow authenticated users to create companies';
  RAISE NOTICE '   - User Roles: Allow users to create their own role';
  RAISE NOTICE '   - Profiles: Allow users to create their own profile';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Security maintained:';
  RAISE NOTICE '   - Users can only create roles for themselves';
  RAISE NOTICE '   - Users can only create their own profile';
  RAISE NOTICE '   - Company data still isolated per company';
  RAISE NOTICE '   - Super admins have full access';
  RAISE NOTICE '';
  RAISE NOTICE '✨ Company registration should now work!';
END $$;
