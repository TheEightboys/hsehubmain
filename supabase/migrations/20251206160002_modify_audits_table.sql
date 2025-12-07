-- Modify audits table to support new features
ALTER TABLE audits 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES audit_templates(id),
ADD COLUMN IF NOT EXISTS iso_code TEXT,
ADD COLUMN IF NOT EXISTS scope TEXT,
ADD COLUMN IF NOT EXISTS responsible_person_id UUID REFERENCES employees(id),
ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_items INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2) DEFAULT 0;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_audits_template_id ON audits(template_id);
CREATE INDEX IF NOT EXISTS idx_audits_iso_code ON audits(iso_code);
CREATE INDEX IF NOT EXISTS idx_audits_responsible_person_id ON audits(responsible_person_id);
