-- ============================================
-- COMPLETE HSE HUB SETUP SCRIPT
-- Run this ONCE to set up everything
-- ============================================
-- This script will:
-- 1. Create subscription packages
-- 2. Create a super admin user
-- 3. Create demo/test company
-- 4. Set up initial settings data
-- ============================================

-- STEP 1: Create Subscription Packages
-- ============================================
INSERT INTO public.subscription_packages (name, tier, price_monthly, price_yearly, max_employees, features, is_active)
VALUES
  (
    'Basic Plan', 
    'basic', 
    29.99, 
    299.99, 
    10, 
    '["Up to 10 employees","Employee management","Basic risk assessments","Incident reporting","Task management","Activity groups","Email support","Cloud storage"]'::jsonb,
    true
  ),
  (
    'Standard Plan', 
    'standard', 
    79.99, 
    799.99, 
    50, 
    '["Up to 50 employees","All Basic features","Advanced risk assessments","Automated workflows (Risk→Training, Audit→Task)","Audit management","Training tracking & compliance","Measures & controls","Real-time notifications","Priority support","Custom reports & analytics","Mobile app access"]'::jsonb,
    true
  ),
  (
    'Premium Plan', 
    'premium', 
    149.99, 
    1499.99, 
    999, 
    '["Unlimited employees","All Standard features","Advanced analytics & dashboards","Risk matrix heatmaps","Compliance scoring","API access","Custom integrations","Dedicated account manager","24/7 phone support","White-label options","Custom workflows","SLA guarantees","Training & onboarding"]'::jsonb,
    true
  )
ON CONFLICT (tier) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  max_employees = EXCLUDED.max_employees,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;

-- ============================================
-- STEP 2: Create Super Admin User
-- ============================================
-- ⚠️ IMPORTANT: Replace 'admin@yourdomain.com' with YOUR actual email address
-- This email should match an account you've already created via sign up

-- First, check if the user exists
DO $$
DECLARE
  v_user_id UUID;
  v_super_admin_email TEXT := 'barathanand2004@gmail.com'; -- ✅ UPDATED!
BEGIN
  -- Get user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_super_admin_email;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found. Please sign up first at /auth, then run this script again.', v_super_admin_email;
  ELSE
    -- Assign super_admin role
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (v_user_id, 'super_admin', NULL)
    ON CONFLICT (user_id, role, company_id) DO NOTHING;
    
    -- Update or create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (v_user_id, v_super_admin_email, 'Super Administrator')
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(profiles.full_name, 'Super Administrator');
    
    RAISE NOTICE 'Super admin role assigned successfully to %', v_super_admin_email;
  END IF;
END $$;

-- ============================================
-- STEP 3: Create Demo Company (Optional)
-- ============================================
-- This creates a test company you can use for demonstration

DO $$
DECLARE
  v_company_id UUID;
  v_admin_user_id UUID;
  v_demo_email TEXT := 'demo@company.com'; -- ← Optional: Change this
BEGIN
  -- Check if demo user exists
  SELECT id INTO v_admin_user_id
  FROM auth.users
  WHERE email = v_demo_email;

  -- Only create demo company if demo user exists
  IF v_admin_user_id IS NOT NULL THEN
    -- Create demo company
    INSERT INTO public.companies (
      name,
      email,
      phone,
      address,
      subscription_tier,
      subscription_status,
      max_employees,
      subscription_start_date,
      subscription_end_date,
      is_active
    ) VALUES (
      'Demo Company Inc',
      v_demo_email,
      '+1 (555) 123-4567',
      '123 Demo Street, Test City, TC 12345',
      'standard',
      'trial',
      50,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '30 days',
      true
    )
    RETURNING id INTO v_company_id;

    -- Assign company_admin role to demo user
    INSERT INTO public.user_roles (user_id, role, company_id)
    VALUES (v_admin_user_id, 'company_admin', v_company_id)
    ON CONFLICT DO NOTHING;

    -- Create demo departments
    INSERT INTO public.departments (company_id, name, description) VALUES
      (v_company_id, 'Administration', 'Administrative and office staff'),
      (v_company_id, 'Production', 'Manufacturing and production workers'),
      (v_company_id, 'Maintenance', 'Equipment and facility maintenance'),
      (v_company_id, 'Quality Control', 'Quality assurance and testing'),
      (v_company_id, 'Logistics', 'Warehouse and shipping operations');

    -- Create demo job roles
    INSERT INTO public.job_roles (company_id, title, description) VALUES
      (v_company_id, 'Safety Manager', 'Oversees all HSE operations'),
      (v_company_id, 'Production Supervisor', 'Manages production floor staff'),
      (v_company_id, 'Machine Operator', 'Operates manufacturing equipment'),
      (v_company_id, 'Warehouse Worker', 'Handles material storage and shipping'),
      (v_company_id, 'Maintenance Technician', 'Repairs and maintains equipment');

    -- Create demo exposure groups
    INSERT INTO public.exposure_groups (company_id, name, description) VALUES
      (v_company_id, 'Chemical Handling', 'Works with hazardous chemicals'),
      (v_company_id, 'Heavy Machinery', 'Operates or works near heavy equipment'),
      (v_company_id, 'Heights', 'Works at elevated locations'),
      (v_company_id, 'Confined Spaces', 'Enters confined or restricted spaces'),
      (v_company_id, 'Noise Exposure', 'Works in high-noise environments');

    -- Create demo risk categories
    INSERT INTO public.risk_categories (company_id, name, description) VALUES
      (v_company_id, 'Physical Hazards', 'Slips, trips, falls, machinery'),
      (v_company_id, 'Chemical Hazards', 'Toxic substances, irritants'),
      (v_company_id, 'Biological Hazards', 'Bacteria, viruses, bloodborne pathogens'),
      (v_company_id, 'Ergonomic Hazards', 'Repetitive strain, poor posture'),
      (v_company_id, 'Psychosocial Hazards', 'Stress, fatigue, workplace violence');

    -- Create demo training types
    INSERT INTO public.training_types (company_id, name, description, duration_hours, validity_months) VALUES
      (v_company_id, 'General Safety Orientation', 'Basic workplace safety introduction', 4, 12),
      (v_company_id, 'Forklift Operation', 'Certified forklift training', 8, 36),
      (v_company_id, 'Hazard Communication', 'Chemical safety and GHS training', 4, 12),
      (v_company_id, 'First Aid & CPR', 'Emergency response training', 8, 24),
      (v_company_id, 'Confined Space Entry', 'Safe confined space procedures', 8, 12);

    -- Create demo audit categories
    INSERT INTO public.audit_categories (company_id, name, description) VALUES
      (v_company_id, 'Workplace Inspection', 'General facility safety audit'),
      (v_company_id, 'Equipment Inspection', 'Machinery and tools audit'),
      (v_company_id, 'PPE Compliance', 'Personal protective equipment check'),
      (v_company_id, 'Emergency Preparedness', 'Emergency response readiness'),
      (v_company_id, 'Documentation Review', 'Records and compliance documents');

    RAISE NOTICE 'Demo company created successfully with ID: %', v_company_id;
    RAISE NOTICE 'Demo company has sample settings data loaded.';
  ELSE
    RAISE NOTICE 'Demo user (%) not found. Skipping demo company creation.', v_demo_email;
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify everything is set up correctly

-- Check subscription packages
SELECT 
  name, 
  tier, 
  price_monthly, 
  max_employees, 
  is_active 
FROM public.subscription_packages 
ORDER BY price_monthly;

-- Check super admin users
SELECT 
  u.email,
  ur.role,
  p.full_name
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
LEFT JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'super_admin';

-- Check companies
SELECT 
  name,
  email,
  subscription_tier,
  subscription_status,
  max_employees,
  subscription_end_date,
  is_active
FROM public.companies
ORDER BY created_at DESC;

-- Check demo company settings (if demo was created)
SELECT 
  c.name as company_name,
  (SELECT COUNT(*) FROM departments WHERE company_id = c.id) as departments,
  (SELECT COUNT(*) FROM job_roles WHERE company_id = c.id) as job_roles,
  (SELECT COUNT(*) FROM exposure_groups WHERE company_id = c.id) as exposure_groups,
  (SELECT COUNT(*) FROM risk_categories WHERE company_id = c.id) as risk_categories,
  (SELECT COUNT(*) FROM training_types WHERE company_id = c.id) as training_types,
  (SELECT COUNT(*) FROM audit_categories WHERE company_id = c.id) as audit_categories
FROM public.companies c
WHERE c.name = 'Demo Company Inc';

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. Sign out and sign back in as super admin
-- 2. Navigate to /super-admin/dashboard
-- 3. You should see the demo company (if created)
-- 4. Test company registration at /register
-- 5. Verify automated workflows work
-- ============================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║        HSE HUB SETUP COMPLETED SUCCESSFULLY!           ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Subscription packages created (Basic, Standard, Premium)';
  RAISE NOTICE '✅ Super admin role assigned';
  RAISE NOTICE '✅ Demo company created with sample data (if user exists)';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 SUPER ADMIN ACCESS:';
  RAISE NOTICE '   1. Sign out and sign back in';
  RAISE NOTICE '   2. Go to /super-admin/dashboard';
  RAISE NOTICE '   3. Check sidebar for red "SUPER ADMIN" section';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '   • Test company registration at /register';
  RAISE NOTICE '   • Create employees and test workflows';
  RAISE NOTICE '   • Verify data isolation between companies';
  RAISE NOTICE '   • Review Reports and Analytics';
  RAISE NOTICE '';
  RAISE NOTICE '📚 DOCUMENTATION:';
  RAISE NOTICE '   • SUPER_ADMIN_ACCESS_GUIDE.md';
  RAISE NOTICE '   • ENHANCED_IMPLEMENTATION_GUIDE.md';
  RAISE NOTICE '   • IMPLEMENTATION_COMPLETE.md';
  RAISE NOTICE '';
END $$;
