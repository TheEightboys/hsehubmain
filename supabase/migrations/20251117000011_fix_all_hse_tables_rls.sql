-- ============================================
-- FIX ALL HSE TABLES RLS POLICIES
-- Apply same pattern as activity_groups to all tables
-- Run this in Supabase SQL Editor
-- ============================================

BEGIN;

-- ============================================
-- Helper function to check user company access
-- ============================================
CREATE OR REPLACE FUNCTION public.user_has_company_access(check_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Check if user is linked via user_roles
    check_company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    -- OR check if user created the company
    check_company_id IN (
      SELECT id FROM public.companies WHERE created_by = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 1. EMPLOYEES TABLE
-- ============================================
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'employees'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.employees', r.policyname);
    END LOOP;
END $$;

CREATE POLICY "employees_select" ON public.employees FOR SELECT
  USING (user_has_company_access(company_id));

CREATE POLICY "employees_insert" ON public.employees FOR INSERT
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "employees_update" ON public.employees FOR UPDATE
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "employees_delete" ON public.employees FOR DELETE
  USING (user_has_company_access(company_id));

-- ============================================
-- 2. RISK ASSESSMENTS TABLE
-- ============================================
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'risk_assessments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.risk_assessments', r.policyname);
    END LOOP;
END $$;

CREATE POLICY "risk_assessments_select" ON public.risk_assessments FOR SELECT
  USING (user_has_company_access(company_id));

CREATE POLICY "risk_assessments_insert" ON public.risk_assessments FOR INSERT
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "risk_assessments_update" ON public.risk_assessments FOR UPDATE
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "risk_assessments_delete" ON public.risk_assessments FOR DELETE
  USING (user_has_company_access(company_id));

-- ============================================
-- 3. AUDITS TABLE
-- ============================================
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audits'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.audits', r.policyname);
    END LOOP;
END $$;

CREATE POLICY "audits_select" ON public.audits FOR SELECT
  USING (user_has_company_access(company_id));

CREATE POLICY "audits_insert" ON public.audits FOR INSERT
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "audits_update" ON public.audits FOR UPDATE
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "audits_delete" ON public.audits FOR DELETE
  USING (user_has_company_access(company_id));

-- ============================================
-- 4. TASKS TABLE
-- ============================================
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', r.policyname);
    END LOOP;
END $$;

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT
  USING (user_has_company_access(company_id));

CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE
  USING (user_has_company_access(company_id));

-- ============================================
-- 5. TRAINING RECORDS TABLE
-- ============================================
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'training_records'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.training_records', r.policyname);
    END LOOP;
END $$;

CREATE POLICY "training_records_select" ON public.training_records FOR SELECT
  USING (user_has_company_access(company_id));

CREATE POLICY "training_records_insert" ON public.training_records FOR INSERT
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "training_records_update" ON public.training_records FOR UPDATE
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "training_records_delete" ON public.training_records FOR DELETE
  USING (user_has_company_access(company_id));

-- ============================================
-- 6. INCIDENTS TABLE (if exists)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incidents') THEN
        -- Drop existing policies
        EXECUTE (
            SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.incidents', policyname), '; ')
            FROM pg_policies WHERE schemaname = 'public' AND tablename = 'incidents'
        );
        
        -- Create new policies
        CREATE POLICY "incidents_select" ON public.incidents FOR SELECT
          USING (user_has_company_access(company_id));

        CREATE POLICY "incidents_insert" ON public.incidents FOR INSERT
          WITH CHECK (user_has_company_access(company_id));

        CREATE POLICY "incidents_update" ON public.incidents FOR UPDATE
          USING (user_has_company_access(company_id))
          WITH CHECK (user_has_company_access(company_id));

        CREATE POLICY "incidents_delete" ON public.incidents FOR DELETE
          USING (user_has_company_access(company_id));
    END IF;
END $$;

-- ============================================
-- 7. MEASURES TABLE (if exists)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'measures') THEN
        -- Drop existing policies
        EXECUTE (
            SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.measures', policyname), '; ')
            FROM pg_policies WHERE schemaname = 'public' AND tablename = 'measures'
        );
        
        -- Create new policies
        CREATE POLICY "measures_select" ON public.measures FOR SELECT
          USING (user_has_company_access(company_id));

        CREATE POLICY "measures_insert" ON public.measures FOR INSERT
          WITH CHECK (user_has_company_access(company_id));

        CREATE POLICY "measures_update" ON public.measures FOR UPDATE
          USING (user_has_company_access(company_id))
          WITH CHECK (user_has_company_access(company_id));

        CREATE POLICY "measures_delete" ON public.measures FOR DELETE
          USING (user_has_company_access(company_id));
    END IF;
END $$;

-- ============================================
-- 8. DOCUMENTS TABLE (if exists)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
        -- Drop existing policies
        EXECUTE (
            SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.documents', policyname), '; ')
            FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents'
        );
        
        -- Create new policies
        CREATE POLICY "documents_select" ON public.documents FOR SELECT
          USING (user_has_company_access(company_id));

        CREATE POLICY "documents_insert" ON public.documents FOR INSERT
          WITH CHECK (user_has_company_access(company_id));

        CREATE POLICY "documents_update" ON public.documents FOR UPDATE
          USING (user_has_company_access(company_id))
          WITH CHECK (user_has_company_access(company_id));

        CREATE POLICY "documents_delete" ON public.documents FOR DELETE
          USING (user_has_company_access(company_id));
    END IF;
END $$;

-- ============================================
-- 9. MESSAGES TABLE (if exists)
-- ============================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        -- Drop existing policies
        EXECUTE (
            SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.messages', policyname), '; ')
            FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages'
        );
        
        -- Create new policies
        CREATE POLICY "messages_select" ON public.messages FOR SELECT
          USING (user_has_company_access(company_id));

        CREATE POLICY "messages_insert" ON public.messages FOR INSERT
          WITH CHECK (user_has_company_access(company_id));

        CREATE POLICY "messages_update" ON public.messages FOR UPDATE
          USING (user_has_company_access(company_id))
          WITH CHECK (user_has_company_access(company_id));

        CREATE POLICY "messages_delete" ON public.messages FOR DELETE
          USING (user_has_company_access(company_id));
    END IF;
END $$;

-- ============================================
-- 10. FIX LOOKUP TABLES (departments, job_roles, etc.)
-- ============================================

-- Departments
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'departments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.departments', r.policyname);
    END LOOP;
END $$;

CREATE POLICY "departments_select" ON public.departments FOR SELECT
  USING (user_has_company_access(company_id));

CREATE POLICY "departments_insert" ON public.departments FOR INSERT
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "departments_update" ON public.departments FOR UPDATE
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "departments_delete" ON public.departments FOR DELETE
  USING (user_has_company_access(company_id));

-- Job Roles
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'job_roles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.job_roles', r.policyname);
    END LOOP;
END $$;

CREATE POLICY "job_roles_select" ON public.job_roles FOR SELECT
  USING (user_has_company_access(company_id));

CREATE POLICY "job_roles_insert" ON public.job_roles FOR INSERT
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "job_roles_update" ON public.job_roles FOR UPDATE
  USING (user_has_company_access(company_id))
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "job_roles_delete" ON public.job_roles FOR DELETE
  USING (user_has_company_access(company_id));

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'employees', 'risk_assessments', 'audits', 'tasks', 'training_records',
    'incidents', 'measures', 'documents', 'messages', 'departments', 'job_roles',
    'activity_groups', 'exposure_groups'
  )
GROUP BY tablename
ORDER BY tablename;

SELECT 'Done! All tables now have proper RLS policies.' as status;
