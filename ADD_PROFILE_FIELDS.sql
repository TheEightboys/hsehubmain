-- Run this SQL directly in Supabase SQL Editor to add profile_fields support

-- Add profile_fields column to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS profile_fields JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN employees.profile_fields IS 'Custom profile fields with dynamic types (text, number, date, yes/no, multi-line text)';

-- Create index for better performance on JSONB queries
CREATE INDEX IF NOT EXISTS idx_employees_profile_fields ON employees USING gin (profile_fields);

-- Verify the column was created
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE
    table_name = 'employees'
    AND column_name = 'profile_fields';