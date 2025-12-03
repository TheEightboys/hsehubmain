-- QUICK FIX: Run this SQL in Supabase SQL Editor NOW
-- Copy everything below and paste into SQL Editor, then click RUN

-- 1. Create employee_activity_logs table
CREATE TABLE IF NOT EXISTS employee_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    employee_id UUID NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    action_type TEXT NOT NULL,
    details TEXT,
    changed_by UUID NOT NULL REFERENCES auth.users (id),
    changed_by_name TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW (),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW ()
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_employee ON employee_activity_logs (employee_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON employee_activity_logs (company_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_changed_at ON employee_activity_logs (changed_at DESC);

-- 3. Enable RLS
ALTER TABLE employee_activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Users can view activity logs in their company" ON employee_activity_logs;

DROP POLICY IF EXISTS "Users can create activity logs" ON employee_activity_logs;

-- 5. Create RLS policies
CREATE POLICY "Users can view activity logs in their company" ON employee_activity_logs FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

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

-- 6. Add profile_fields column to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_fields JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_employees_profile_fields ON employees USING gin (profile_fields);

-- 7. Verify setup
SELECT
    'Setup complete!' as message,
    EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE
            table_name = 'employee_activity_logs'
    ) as activity_table_exists,
    EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE
            table_name = 'employees'
            AND column_name = 'profile_fields'
    ) as profile_fields_exists;