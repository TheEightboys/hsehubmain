-- Quick test to verify activity logging is working

-- 1. Check if employee_activity_logs table exists
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE
            table_name = 'employee_activity_logs'
    ) AS table_exists;

-- 2. Check table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE
    table_name = 'employee_activity_logs'
ORDER BY ordinal_position;

-- 3. Check recent activity logs (last 10)
SELECT
    id,
    action,
    action_type,
    details,
    changed_by_name,
    changed_at
FROM employee_activity_logs
ORDER BY changed_at DESC
LIMIT 10;

-- 4. Count activity logs per employee
SELECT e.full_name, e.employee_number, COUNT(eal.id) as activity_count
FROM
    employees e
    LEFT JOIN employee_activity_logs eal ON eal.employee_id = e.id
GROUP BY
    e.id,
    e.full_name,
    e.employee_number
ORDER BY activity_count DESC
LIMIT 10;

-- 5. Check RLS policies
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE
    tablename = 'employee_activity_logs';