-- Create approval_workflows table
CREATE TABLE IF NOT EXISTS public.approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    company_id UUID REFERENCES public.companies (id) ON DELETE CASCADE NOT NULL,
    department_id UUID REFERENCES public.departments (id) ON DELETE CASCADE NOT NULL,
    approver_id UUID REFERENCES public.employees (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW (),
    updated_at TIMESTAMPTZ DEFAULT NOW (),
    UNIQUE (company_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_company ON public.approval_workflows (company_id);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_department ON public.approval_workflows (department_id);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_approver ON public.approval_workflows (approver_id);

-- Enable RLS
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "approval_workflows_select_policy" ON public.approval_workflows;

CREATE POLICY "approval_workflows_select_policy" ON public.approval_workflows FOR
SELECT TO authenticated USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "approval_workflows_insert_policy" ON public.approval_workflows;

CREATE POLICY "approval_workflows_insert_policy" ON public.approval_workflows FOR INSERT TO authenticated
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "approval_workflows_update_policy" ON public.approval_workflows;

CREATE POLICY "approval_workflows_update_policy" ON public.approval_workflows FOR
UPDATE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

DROP POLICY IF EXISTS "approval_workflows_delete_policy" ON public.approval_workflows;

CREATE POLICY "approval_workflows_delete_policy" ON public.approval_workflows FOR DELETE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

GRANT
SELECT, INSERT,
UPDATE, DELETE ON public.approval_workflows TO authenticated;