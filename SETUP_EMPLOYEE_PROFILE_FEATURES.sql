-- ============================================================================
-- EMPLOYEE PROFILE FEATURES - DATABASE SETUP
-- Run this in Supabase SQL Editor to enable all employee profile features
-- ============================================================================

-- 1. Add profile_fields column to employees table
-- This stores custom fields like language skills, certifications, etc.
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS profile_fields JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN employees.profile_fields IS 'Custom profile fields with dynamic types (text, number, date, yes/no, multi-line text)';

-- Create index for better performance on JSONB queries
CREATE INDEX IF NOT EXISTS idx_employees_profile_fields ON employees USING gin (profile_fields);

-- ============================================================================
-- 2. Ensure employee_activity_logs table exists with proper structure
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    employee_id UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    action_type TEXT NOT NULL, -- create, update, delete, upload, status_change
    details TEXT,
    changed_by UUID NOT NULL REFERENCES auth.users (id),
    changed_by_name TEXT NOT NULL,
    changed_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW (),
        metadata JSONB,
        created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT NOW ()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_employee ON employee_activity_logs (employee_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON employee_activity_logs (company_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_changed_at ON employee_activity_logs (changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON employee_activity_logs (action_type);

-- Add RLS policies for employee_activity_logs
ALTER TABLE employee_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view activity logs for employees in their company
CREATE POLICY "Users can view activity logs in their company" ON employee_activity_logs FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

-- Policy: Users can create activity logs for their company
CREATE POLICY "Users can create activity logs" ON employee_activity_logs FOR INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

-- ============================================================================
-- 3. Verify setup
-- ============================================================================

-- Check if profile_fields column exists
SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE
    table_name = 'employees'
    AND column_name = 'profile_fields';

-- Check if employee_activity_logs table exists
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE
    table_name = 'employee_activity_logs'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE
    tablename IN (
        'employees',
        'employee_activity_logs'
    )
ORDER BY tablename, policyname;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 'Database setup completed successfully! ✓' AS status;

SELECT 'Profile fields and activity logging are now enabled.' AS message;