-- ============================================
-- FIX AUDITS RLS POLICY
-- ============================================
-- This migration fixes the audit creation issue by adding
-- a proper INSERT policy that allows company users to create audits

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Company admins can manage audits" ON public.audits;

-- Add separate policies for better control
CREATE POLICY "Company users can insert audits"
  ON public.audits FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id)
  );

CREATE POLICY "Company users can update their audits"
  ON public.audits FOR UPDATE
  USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company users can delete their audits"
  ON public.audits FOR DELETE
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );