-- Create audit templates table
CREATE TABLE IF NOT EXISTS audit_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  iso_code TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE audit_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's audit templates"
  ON audit_templates FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert audit templates for their company"
  ON audit_templates FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their company's audit templates"
  ON audit_templates FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM employees WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their company's audit templates"
  ON audit_templates FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM employees WHERE user_id = auth.uid()
  ));

-- Add indexes
CREATE INDEX idx_audit_templates_company_id ON audit_templates(company_id);
CREATE INDEX idx_audit_templates_iso_code ON audit_templates(iso_code);
