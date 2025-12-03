-- RUN THIS SQL IN SUPABASE TO IMPLEMENT ALL CLIENT REQUIREMENTS
-- This adds the necessary tables for Settings page features

-- 1. Create measure_building_blocks table
CREATE TABLE IF NOT EXISTS public.measure_building_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    company_id UUID REFERENCES public.companies (id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW (),
    updated_at TIMESTAMPTZ DEFAULT NOW ()
);

CREATE INDEX IF NOT EXISTS idx_measure_blocks_company ON public.measure_building_blocks (company_id);

ALTER TABLE public.measure_building_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "measure_blocks_select" ON public.measure_building_blocks FOR
SELECT TO authenticated USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

CREATE POLICY "measure_blocks_insert" ON public.measure_building_blocks FOR INSERT TO authenticated
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

CREATE POLICY "measure_blocks_update" ON public.measure_building_blocks FOR
UPDATE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

CREATE POLICY "measure_blocks_delete" ON public.measure_building_blocks FOR DELETE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

GRANT
SELECT, INSERT,
UPDATE, DELETE ON public.measure_building_blocks TO authenticated;

-- 2. Create risk_matrix_labels table
CREATE TABLE IF NOT EXISTS public.risk_matrix_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    company_id UUID REFERENCES public.companies (id) ON DELETE CASCADE NOT NULL,
    label_type TEXT NOT NULL CHECK (
        label_type IN (
            'likelihood',
            'severity',
            'result'
        )
    ),
    label_order INTEGER NOT NULL,
    label_text TEXT NOT NULL,
    color_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW (),
    updated_at TIMESTAMPTZ DEFAULT NOW (),
    UNIQUE (
        company_id,
        label_type,
        label_order
    )
);

CREATE INDEX IF NOT EXISTS idx_risk_labels_company ON public.risk_matrix_labels (company_id);

ALTER TABLE public.risk_matrix_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_labels_select" ON public.risk_matrix_labels FOR
SELECT TO authenticated USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

CREATE POLICY "risk_labels_insert" ON public.risk_matrix_labels FOR INSERT TO authenticated
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

CREATE POLICY "risk_labels_update" ON public.risk_matrix_labels FOR
UPDATE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

CREATE POLICY "risk_labels_delete" ON public.risk_matrix_labels FOR DELETE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

GRANT
SELECT, INSERT,
UPDATE, DELETE ON public.risk_matrix_labels TO authenticated;

-- 3. Create interval_configurations table
CREATE TABLE IF NOT EXISTS public.interval_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    company_id UUID REFERENCES public.companies (id) ON DELETE CASCADE NOT NULL,
    config_type TEXT NOT NULL CHECK (
        config_type IN (
            'gbu_interval',
            'audit_interval',
            'notification_days_examinations',
            'notification_days_audits',
            'notification_days_gbu_review',
            'notification_days_qualifications'
        )
    ),
    config_key TEXT NOT NULL,
    config_value INTEGER NOT NULL,
    unit TEXT DEFAULT 'months',
    created_at TIMESTAMPTZ DEFAULT NOW (),
    updated_at TIMESTAMPTZ DEFAULT NOW (),
    UNIQUE (
        company_id,
        config_type,
        config_key
    )
);

CREATE INDEX IF NOT EXISTS idx_interval_config_company ON public.interval_configurations (company_id);

ALTER TABLE public.interval_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "interval_config_select" ON public.interval_configurations FOR
SELECT TO authenticated USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

CREATE POLICY "interval_config_insert" ON public.interval_configurations FOR INSERT TO authenticated
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

CREATE POLICY "interval_config_update" ON public.interval_configurations FOR
UPDATE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

CREATE POLICY "interval_config_delete" ON public.interval_configurations FOR DELETE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);

GRANT
SELECT, INSERT,
UPDATE, DELETE ON public.interval_configurations TO authenticated;

-- 4. Insert default risk matrix labels for all companies (optional - can be done per company)
-- This is just an example - companies can customize these

-- Verify all tables were created
SELECT schemaname, tablename
FROM pg_tables
WHERE
    schemaname = 'public'
    AND tablename IN (
        'measure_building_blocks',
        'risk_matrix_labels',
        'interval_configurations'
    );