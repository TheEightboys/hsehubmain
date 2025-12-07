-- Make email column nullable in employees table
-- This allows employees to be created without an email address

ALTER TABLE employees 
ALTER COLUMN email DROP NOT NULL;

-- Add a comment to document this change
COMMENT ON COLUMN employees.email IS 'Employee email address (optional)';
