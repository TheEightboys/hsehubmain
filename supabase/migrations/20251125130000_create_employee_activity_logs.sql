-- Create employee_activity_logs table
CREATE TABLE IF NOT EXISTS public.employee_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    employee_id UUID NOT NULL REFERENCES public.employees (id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'upload', 'status_change', etc.
    details TEXT,
    changed_by UUID NOT NULL REFERENCES auth.users (id),
    changed_by_name TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW (),
    metadata JSONB, -- Additional structured data about the change
    created_at TIMESTAMPTZ DEFAULT NOW ()
);

-- Create indexes
CREATE INDEX idx_employee_activity_logs_employee ON public.employee_activity_logs (employee_id);

CREATE INDEX idx_employee_activity_logs_company ON public.employee_activity_logs (company_id);

CREATE INDEX idx_employee_activity_logs_changed_at ON public.employee_activity_logs (changed_at DESC);

CREATE INDEX idx_employee_activity_logs_action_type ON public.employee_activity_logs (action_type);

-- Add comments
COMMENT ON TABLE public.employee_activity_logs IS 'Tracks all activities and changes related to employees';

COMMENT ON COLUMN public.employee_activity_logs.action IS 'Human-readable description of the action';

COMMENT ON COLUMN public.employee_activity_logs.action_type IS 'Category of the action for filtering';

COMMENT ON COLUMN public.employee_activity_logs.metadata IS 'JSON object containing additional context about the change';

-- Enable RLS
ALTER TABLE public.employee_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view activity logs for employees in their company
CREATE POLICY "employee_activity_logs_select_policy" ON public.employee_activity_logs FOR
SELECT TO authenticated USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

-- Users with appropriate roles can insert activity logs
CREATE POLICY "employee_activity_logs_insert_policy" 
ON public.employee_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
    company_id IN (
        SELECT ur.company_id 
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('owner', 'admin', 'manager', 'employee')
    )
);

-- Grant permissions
GRANT
SELECT, INSERT ON public.employee_activity_logs TO authenticated;