-- Create iso_standards table (for tracking selected ISOs per company)
CREATE TABLE IF NOT EXISTS public.company_iso_standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    company_id UUID REFERENCES public.companies (id) ON DELETE CASCADE NOT NULL,
    iso_code TEXT NOT NULL, -- e.g., 'ISO_45001', 'ISO_14001', or custom names
    iso_name TEXT NOT NULL, -- Display name
    is_custom BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW (),
    updated_at TIMESTAMPTZ DEFAULT NOW (),
    UNIQUE (company_id, iso_code)
);

-- Create iso_criteria table (criteria for each ISO)
CREATE TABLE IF NOT EXISTS public.iso_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    company_id UUID REFERENCES public.companies (id) ON DELETE CASCADE NOT NULL,
    iso_standard_id UUID REFERENCES public.company_iso_standards (id) ON DELETE CASCADE NOT NULL,
    criterion_text TEXT NOT NULL,
    is_custom BOOLEAN DEFAULT false,
    is_checked BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW (),
    updated_at TIMESTAMPTZ DEFAULT NOW ()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_iso_standards_company ON public.company_iso_standards (company_id);

CREATE INDEX IF NOT EXISTS idx_iso_criteria_company ON public.iso_criteria (company_id);

CREATE INDEX IF NOT EXISTS idx_iso_criteria_standard ON public.iso_criteria (iso_standard_id);

-- Enable RLS
ALTER TABLE public.company_iso_standards ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.iso_criteria ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_iso_standards
DROP POLICY IF EXISTS "company_iso_standards_select_policy" ON public.company_iso_standards;

CREATE POLICY "company_iso_standards_select_policy" ON public.company_iso_standards FOR
SELECT TO authenticated USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "company_iso_standards_insert_policy" ON public.company_iso_standards;

CREATE POLICY "company_iso_standards_insert_policy" ON public.company_iso_standards FOR INSERT TO authenticated
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "company_iso_standards_update_policy" ON public.company_iso_standards;

CREATE POLICY "company_iso_standards_update_policy" ON public.company_iso_standards FOR
UPDATE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

DROP POLICY IF EXISTS "company_iso_standards_delete_policy" ON public.company_iso_standards;

CREATE POLICY "company_iso_standards_delete_policy" ON public.company_iso_standards FOR DELETE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

-- RLS Policies for iso_criteria
DROP POLICY IF EXISTS "iso_criteria_select_policy" ON public.iso_criteria;

CREATE POLICY "iso_criteria_select_policy" ON public.iso_criteria FOR
SELECT TO authenticated USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "iso_criteria_insert_policy" ON public.iso_criteria;

CREATE POLICY "iso_criteria_insert_policy" ON public.iso_criteria FOR INSERT TO authenticated
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "iso_criteria_update_policy" ON public.iso_criteria;

CREATE POLICY "iso_criteria_update_policy" ON public.iso_criteria FOR
UPDATE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

DROP POLICY IF EXISTS "iso_criteria_delete_policy" ON public.iso_criteria;

CREATE POLICY "iso_criteria_delete_policy" ON public.iso_criteria FOR DELETE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

GRANT
SELECT, INSERT,
UPDATE, DELETE ON public.company_iso_standards TO authenticated;

GRANT
SELECT, INSERT,
UPDATE, DELETE ON public.iso_criteria TO authenticated;

-- Add is_predefined column to risk_categories if it doesn't exist
ALTER TABLE public.risk_categories
ADD COLUMN IF NOT EXISTS is_predefined BOOLEAN DEFAULT false;

-- Update existing risk categories to mark predefined ones
UPDATE public.risk_categories
SET
    is_predefined = true
WHERE
    name IN (
        'Low',
        'Medium',
        'High',
        'Very High'
    );