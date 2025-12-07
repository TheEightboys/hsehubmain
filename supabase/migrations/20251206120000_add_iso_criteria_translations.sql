-- Add English translation columns to ISO criteria tables
-- This migration adds English translations alongside existing German text

-- Add English translation column to sections table
ALTER TABLE iso_criteria_sections 
ADD COLUMN IF NOT EXISTS title_en TEXT;

-- Add English translation column to subsections table
ALTER TABLE iso_criteria_subsections 
ADD COLUMN IF NOT EXISTS title_en TEXT;

-- Add English translation column to questions table
ALTER TABLE iso_criteria_questions 
ADD COLUMN IF NOT EXISTS question_text_en TEXT;

-- Rename existing columns to be more explicit about language (optional - keeping for clarity)
-- Note: We'll keep the original column names and add _de suffix via aliases in queries
-- This avoids breaking existing code

-- Add comments to document the columns
COMMENT ON COLUMN iso_criteria_sections.title IS 'German title (default)';
COMMENT ON COLUMN iso_criteria_sections.title_en IS 'English title';

COMMENT ON COLUMN iso_criteria_subsections.title IS 'German title (default)';
COMMENT ON COLUMN iso_criteria_subsections.title_en IS 'English title';

COMMENT ON COLUMN iso_criteria_questions.question_text IS 'German question text (default)';
COMMENT ON COLUMN iso_criteria_questions.question_text_en IS 'English question text';
