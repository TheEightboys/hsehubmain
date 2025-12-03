-- Add profile_fields column to employees table to store custom fields
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS profile_fields JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN employees.profile_fields IS 'Custom profile fields with dynamic types (text, number, date, yes/no)';

-- Create index for better performance on JSONB queries
CREATE INDEX IF NOT EXISTS idx_employees_profile_fields ON employees USING gin (profile_fields);