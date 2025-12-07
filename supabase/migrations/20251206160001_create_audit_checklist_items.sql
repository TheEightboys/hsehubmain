-- Create audit checklist items table
CREATE TABLE IF NOT EXISTS audit_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  section_id UUID REFERENCES iso_criteria_sections(id),
  subsection_id UUID REFERENCES iso_criteria_subsections(id),
  question_id UUID REFERENCES iso_criteria_questions(id),
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'not_applicable')) DEFAULT 'pending',
  notes TEXT,
  checked_by UUID REFERENCES employees(id),
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE audit_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist items for their company's audits"
  ON audit_checklist_items FOR SELECT
  USING (audit_id IN (
    SELECT id FROM audits WHERE company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert checklist items for their company's audits"
  ON audit_checklist_items FOR INSERT
  WITH CHECK (audit_id IN (
    SELECT id FROM audits WHERE company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update checklist items for their company's audits"
  ON audit_checklist_items FOR UPDATE
  USING (audit_id IN (
    SELECT id FROM audits WHERE company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete checklist items for their company's audits"
  ON audit_checklist_items FOR DELETE
  USING (audit_id IN (
    SELECT id FROM audits WHERE company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  ));

-- Add indexes
CREATE INDEX idx_audit_checklist_items_audit_id ON audit_checklist_items(audit_id);
CREATE INDEX idx_audit_checklist_items_section_id ON audit_checklist_items(section_id);
CREATE INDEX idx_audit_checklist_items_status ON audit_checklist_items(status);

-- Create function to update audit progress
CREATE OR REPLACE FUNCTION update_audit_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE audits
  SET 
    total_items = (
      SELECT COUNT(*) FROM audit_checklist_items WHERE audit_id = NEW.audit_id
    ),
    completed_items = (
      SELECT COUNT(*) FROM audit_checklist_items 
      WHERE audit_id = NEW.audit_id AND status IN ('completed', 'not_applicable')
    ),
    progress_percentage = (
      SELECT CASE 
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND((COUNT(*) FILTER (WHERE status IN ('completed', 'not_applicable'))::DECIMAL / COUNT(*)) * 100, 2)
      END
      FROM audit_checklist_items WHERE audit_id = NEW.audit_id
    ),
    updated_at = NOW()
  WHERE id = NEW.audit_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update progress
CREATE TRIGGER trigger_update_audit_progress
AFTER INSERT OR UPDATE OR DELETE ON audit_checklist_items
FOR EACH ROW
EXECUTE FUNCTION update_audit_progress();
