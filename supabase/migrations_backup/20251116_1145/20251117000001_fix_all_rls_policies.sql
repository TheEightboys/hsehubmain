-- ============================================
-- FIX ALL RLS POLICIES - COMPREHENSIVE FIX
-- ============================================
-- This migration fixes RLS policies across all tables to ensure
-- proper permissions for company users to create records
-- ============================================

-- ============================================
-- 1. FIX AUDITS POLICIES
-- ============================================

-- Drop ALL existing policies for audits
DROP POLICY IF EXISTS "Company admins can manage audits" ON public.audits;
DROP POLICY IF EXISTS "Company users can insert audits" ON public.audits;
DROP POLICY IF EXISTS "Company users can update their audits" ON public.audits;
DROP POLICY IF EXISTS "Company users can delete their audits" ON public.audits;

-- Add proper policies (fresh)
CREATE POLICY "Company users can insert audits"
  ON public.audits FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE POLICY "Company users can update audits"
  ON public.audits FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users can delete audits"
  ON public.audits FOR DELETE
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

-- ============================================
-- 2. FIX EMPLOYEES POLICIES
-- ============================================

-- Drop ALL existing employee policies
DROP POLICY IF EXISTS "Company admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Company users can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Company users can update employees" ON public.employees;
DROP POLICY IF EXISTS "Company users can delete employees" ON public.employees;

-- Create proper policies
CREATE POLICY "Company users can insert employees"
  ON public.employees FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE POLICY "Company users can update employees"
  ON public.employees FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- 3. FIX RISK ASSESSMENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Company users can insert risks" ON public.risk_assessments;
DROP POLICY IF EXISTS "Company users can update risks" ON public.risk_assessments;

CREATE POLICY "Company users can insert risks"
  ON public.risk_assessments FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE POLICY "Company users can update risks"
  ON public.risk_assessments FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- 4. FIX TASKS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Company users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Company users can update tasks" ON public.tasks;

CREATE POLICY "Company users can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE POLICY "Company users can update tasks"
  ON public.tasks FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- 5. FIX TRAINING RECORDS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Company users can insert training" ON public.training_records;
DROP POLICY IF EXISTS "Company users can update training" ON public.training_records;

CREATE POLICY "Company users can insert training"
  ON public.training_records FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE POLICY "Company users can update training"
  ON public.training_records FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- 6. FIX MEASURES POLICIES
-- ============================================

DROP POLICY IF EXISTS "Company users can insert measures" ON public.measures;
DROP POLICY IF EXISTS "Company users can update measures" ON public.measures;

CREATE POLICY "Company users can insert measures"
  ON public.measures FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE POLICY "Company users can update measures"
  ON public.measures FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- 7. FIX INCIDENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Company users can insert incidents" ON public.incidents;
DROP POLICY IF EXISTS "Company users can update incidents" ON public.incidents;

CREATE POLICY "Company users can insert incidents"
  ON public.incidents FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE POLICY "Company users can update incidents"
  ON public.incidents FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- 8. FIX ACTIVITY GROUPS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Company users can insert activity groups" ON public.activity_groups;
DROP POLICY IF EXISTS "Company users can update activity groups" ON public.activity_groups;

CREATE POLICY "Company users can insert activity groups"
  ON public.activity_groups FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE POLICY "Company users can update activity groups"
  ON public.activity_groups FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- 9. FIX DOCUMENTS POLICIES (Skip if table doesn't exist)
-- ============================================

-- Documents table may not exist yet, so we'll skip it
-- Uncomment these lines when documents table is created:
-- DROP POLICY IF EXISTS "Company users can insert documents" ON public.documents;
-- DROP POLICY IF EXISTS "Company users can update documents" ON public.documents;
-- CREATE POLICY "Company users can insert documents"
--   ON public.documents FOR INSERT
--   WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));
-- CREATE POLICY "Company users can update documents"
--   ON public.documents FOR UPDATE
--   USING (public.user_belongs_to_company(auth.uid(), company_id))
--   WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify policies are correct:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('audits', 'employees', 'risk_assessments', 'tasks', 'training_records', 'measures', 'incidents', 'activity_groups') ORDER BY tablename, cmd;