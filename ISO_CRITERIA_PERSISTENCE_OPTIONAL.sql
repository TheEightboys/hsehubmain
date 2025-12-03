-- Migration: ISO Criteria Persistence (Optional Enhancement)
-- Date: 2024
-- Description: Creates table to persist custom ISO criteria and their checked states
-- NOTE: This is optional - the current implementation stores custom criteria in component state

-- Create table for company ISO criteria
CREATE TABLE IF NOT EXISTS company_iso_criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  iso_code TEXT NOT NULL,
  criterion_text TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT false,
  is_custom BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

-- Ensure unique criteria per company and ISO
UNIQUE(company_id, iso_code, criterion_text) );

-- Add table comment
COMMENT ON TABLE company_iso_criteria IS 'Stores custom criteria for ISO standards per company';

COMMENT ON COLUMN company_iso_criteria.iso_code IS 'ISO standard identifier (e.g., ISO_45001, ISO_14001)';

COMMENT ON COLUMN company_iso_criteria.criterion_text IS 'The criterion description/text';

COMMENT ON COLUMN company_iso_criteria.is_checked IS 'Whether this criterion is currently checked/selected';

COMMENT ON COLUMN company_iso_criteria.is_custom IS 'True for user-added criteria, false for predefined';

COMMENT ON COLUMN company_iso_criteria.display_order IS 'Order for displaying criteria (custom criteria shown after predefined)';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_iso_criteria_company_id ON company_iso_criteria (company_id);

CREATE INDEX IF NOT EXISTS idx_iso_criteria_iso_code ON company_iso_criteria (iso_code);

CREATE INDEX IF NOT EXISTS idx_iso_criteria_company_iso ON company_iso_criteria (company_id, iso_code);

-- Enable Row Level Security
ALTER TABLE company_iso_criteria ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their company's ISO criteria" ON company_iso_criteria;

DROP POLICY IF EXISTS "Users can insert their company's ISO criteria" ON company_iso_criteria;

DROP POLICY IF EXISTS "Users can update their company's ISO criteria" ON company_iso_criteria;

DROP POLICY IF EXISTS "Users can delete their company's ISO criteria" ON company_iso_criteria;

-- Create RLS policies
-- Policy 1: View criteria for user's company
CREATE POLICY "Users can view their company's ISO criteria" ON company_iso_criteria FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM employees
            WHERE
                id = auth.uid ()
        )
    );

-- Policy 2: Insert criteria for user's company
CREATE POLICY "Users can insert their company's ISO criteria" ON company_iso_criteria FOR INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM employees
            WHERE
                id = auth.uid ()
        )
    );

-- Policy 3: Update criteria for user's company
CREATE POLICY "Users can update their company's ISO criteria" ON company_iso_criteria FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM employees
        WHERE
            id = auth.uid ()
    )
);

-- Policy 4: Delete criteria for user's company (only custom criteria)
CREATE POLICY "Users can delete their company's ISO criteria" ON company_iso_criteria FOR DELETE USING (
    is_custom = true
    AND company_id IN (
        SELECT company_id
        FROM employees
        WHERE
            id = auth.uid ()
    )
);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_iso_criteria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_iso_criteria_timestamp ON company_iso_criteria;

CREATE TRIGGER update_iso_criteria_timestamp
  BEFORE UPDATE ON company_iso_criteria
  FOR EACH ROW
  EXECUTE FUNCTION update_iso_criteria_updated_at();

-- Optional: Seed predefined criteria (if you want to store them in DB)
-- This would replace the hardcoded predefinedCriteria object in the frontend
/*
-- Example for ISO 45001 Compact criteria
INSERT INTO company_iso_criteria (company_id, iso_code, criterion_text, is_custom, display_order)
SELECT 
c.id as company_id,
'ISO_45001' as iso_code,
unnest(ARRAY[
'Context of the organization',
'Leadership and worker participation',
'Planning',
'Support and operation'
]) as criterion_text,
false as is_custom,
generate_series(1, 4) as display_order
FROM companies c
WHERE NOT EXISTS (
SELECT 1 FROM company_iso_criteria 
WHERE company_id = c.id AND iso_code = 'ISO_45001'
);
*/

-- Verification queries
SELECT 'Table created successfully' as status, COUNT(*) as total_criteria
FROM company_iso_criteria;

SELECT 'RLS policies' as check_type, COUNT(*) as policy_count
FROM pg_policies
WHERE
    tablename = 'company_iso_criteria';

-- Query to check structure
\d company_iso_criteria;