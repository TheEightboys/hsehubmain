-- Migration: Add profile fields to employees table
-- Date: 2024
-- Description: Adds languages, skills, and salary fields to employee profiles

-- Add new columns to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS languages TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT,
ADD COLUMN IF NOT EXISTS salary TEXT;

-- Add column comments for documentation
COMMENT ON COLUMN employees.languages IS 'Languages known by the employee (free text, multi-line supported)';

COMMENT ON COLUMN employees.skills IS 'Professional skills and competencies (free text, multi-line supported)';

COMMENT ON COLUMN employees.salary IS 'Salary information (free text format, e.g., "€50,000 per year")';

-- Optional: Create indexes for better query performance (if these fields will be searched frequently)
-- CREATE INDEX IF NOT EXISTS idx_employees_languages ON employees USING gin(to_tsvector('english', languages));
-- CREATE INDEX IF NOT EXISTS idx_employees_skills ON employees USING gin(to_tsvector('english', skills));

-- Verification query to check columns were added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE
    table_name = 'employees'
    AND column_name IN (
        'languages',
        'skills',
        'salary'
    );