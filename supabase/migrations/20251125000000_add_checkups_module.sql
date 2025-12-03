-- ============================================
-- CHECK-UPS MODULE - DATABASE SETUP
-- Creates tables for G-Investigations and Health Check-ups
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CREATE ENUMS
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.checkup_status AS ENUM ('done', 'open', 'planned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- G-INVESTIGATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.g_investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_company_investigation UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_g_investigations_company ON public.g_investigations(company_id);

COMMENT ON TABLE public.g_investigations IS 'G-Investigations (Occupational Medical Care) configured in Settings';
COMMENT ON COLUMN public.g_investigations.name IS 'Investigation name (e.g., Vision Test, Hearing Test)';

-- ============================================
-- HEALTH CHECK-UPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.health_checkups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    investigation_id UUID REFERENCES public.g_investigations(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    status public.checkup_status DEFAULT 'open' NOT NULL,
    completion_date DATE,
    certificate_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_checkups_employee ON public.health_checkups(employee_id);
CREATE INDEX IF NOT EXISTS idx_health_checkups_company ON public.health_checkups(company_id);
CREATE INDEX IF NOT EXISTS idx_health_checkups_status ON public.health_checkups(status);
CREATE INDEX IF NOT EXISTS idx_health_checkups_investigation ON public.health_checkups(investigation_id);

COMMENT ON TABLE public.health_checkups IS 'Employee health check-ups with auto-scheduling (3-year intervals)';
COMMENT ON COLUMN public.health_checkups.status IS 'Status: done, open, or planned';
COMMENT ON COLUMN public.health_checkups.completion_date IS 'Required when status is done - triggers auto-scheduling';

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- G-Investigations RLS
ALTER TABLE public.g_investigations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "g_investigations_select_policy" ON public.g_investigations;
CREATE POLICY "g_investigations_select_policy" ON public.g_investigations
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "g_investigations_insert_policy" ON public.g_investigations;
CREATE POLICY "g_investigations_insert_policy" ON public.g_investigations
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "g_investigations_update_policy" ON public.g_investigations;
CREATE POLICY "g_investigations_update_policy" ON public.g_investigations
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "g_investigations_delete_policy" ON public.g_investigations;
CREATE POLICY "g_investigations_delete_policy" ON public.g_investigations
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

-- Health Check-ups RLS
ALTER TABLE public.health_checkups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "health_checkups_select_policy" ON public.health_checkups;
CREATE POLICY "health_checkups_select_policy" ON public.health_checkups
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "health_checkups_insert_policy" ON public.health_checkups;
CREATE POLICY "health_checkups_insert_policy" ON public.health_checkups
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin', 'employee')
        )
    );

DROP POLICY IF EXISTS "health_checkups_update_policy" ON public.health_checkups;
CREATE POLICY "health_checkups_update_policy" ON public.health_checkups
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin', 'employee')
        )
    );

DROP POLICY IF EXISTS "health_checkups_delete_policy" ON public.health_checkups;
CREATE POLICY "health_checkups_delete_policy" ON public.health_checkups
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.g_investigations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_checkups TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Check-ups Module database setup completed successfully!';
    RAISE NOTICE '   - g_investigations table created';
    RAISE NOTICE '   - health_checkups table created';
    RAISE NOTICE '   - checkup_status enum created';
    RAISE NOTICE '   - RLS policies enabled on both tables';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Add G-Investigations management to Settings page';
    RAISE NOTICE '   2. Complete Check-ups tab UI in Employee Profile';
    RAISE NOTICE '   3. Test auto-scheduling (3-year intervals)';
END $$;
