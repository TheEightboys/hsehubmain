-- Create ISO Criteria Management Tables
-- This migration creates tables to store complete ISO standard checklists
-- with hierarchical structure (sections → subsections → questions)

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main sections table (e.g., "1. Kontext der Organisation")
CREATE TABLE IF NOT EXISTS iso_criteria_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  iso_code TEXT NOT NULL, -- 'ISO_9001', 'ISO_45001', etc.
  section_number TEXT NOT NULL, -- '1', '2', '3', etc.
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(iso_code, section_number)
);

-- Subsections table (e.g., "1.1 Interne Themen identifizieren")
CREATE TABLE IF NOT EXISTS iso_criteria_subsections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES iso_criteria_sections(id) ON DELETE CASCADE,
  subsection_number TEXT NOT NULL, -- '1.1', '1.2', etc.
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section_id, subsection_number)
);

-- Individual criteria questions
CREATE TABLE IF NOT EXISTS iso_criteria_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subsection_id UUID NOT NULL REFERENCES iso_criteria_subsections(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company-specific responses to criteria
CREATE TABLE IF NOT EXISTS iso_criteria_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES iso_criteria_questions(id) ON DELETE CASCADE,
  umgesetzt BOOLEAN DEFAULT FALSE, -- Implemented
  zufrieden BOOLEAN DEFAULT FALSE, -- Satisfied
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  UNIQUE(company_id, question_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_iso_sections_code ON iso_criteria_sections(iso_code);
CREATE INDEX IF NOT EXISTS idx_iso_subsections_section ON iso_criteria_subsections(section_id);
CREATE INDEX IF NOT EXISTS idx_iso_questions_subsection ON iso_criteria_questions(subsection_id);
CREATE INDEX IF NOT EXISTS idx_iso_responses_company ON iso_criteria_responses(company_id);
CREATE INDEX IF NOT EXISTS idx_iso_responses_question ON iso_criteria_responses(question_id);

-- Enable Row Level Security
ALTER TABLE iso_criteria_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE iso_criteria_subsections ENABLE ROW LEVEL SECURITY;
ALTER TABLE iso_criteria_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE iso_criteria_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sections, subsections, and questions (read-only for all authenticated users)
CREATE POLICY "Anyone can view ISO sections"
  ON iso_criteria_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view ISO subsections"
  ON iso_criteria_subsections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view ISO questions"
  ON iso_criteria_questions FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for responses (company-specific)
CREATE POLICY "Users can view their company's responses"
  ON iso_criteria_responses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their company's responses"
  ON iso_criteria_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their company's responses"
  ON iso_criteria_responses FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their company's responses"
  ON iso_criteria_responses FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM employees WHERE user_id = auth.uid()
    )
  );

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_iso_response_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamp
CREATE TRIGGER update_iso_response_timestamp
  BEFORE UPDATE ON iso_criteria_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_iso_response_timestamp();

-- Grant permissions
GRANT SELECT ON iso_criteria_sections TO authenticated;
GRANT SELECT ON iso_criteria_subsections TO authenticated;
GRANT SELECT ON iso_criteria_questions TO authenticated;
GRANT ALL ON iso_criteria_responses TO authenticated;
