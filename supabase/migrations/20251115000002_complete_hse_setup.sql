-- ============================================
-- HSE MANAGEMENT SYSTEM - COMPLETE DATABASE SETUP
-- Run this script in Supabase SQL Editor
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- DROP EXISTING OBJECTS (if rerunning script)
-- ============================================
DROP TRIGGER IF EXISTS trigger_generate_incident_number ON public.incidents;
DROP FUNCTION IF EXISTS generate_incident_number();

DROP TABLE IF EXISTS public.activity_training_requirements CASCADE;
DROP TABLE IF EXISTS public.activity_risk_links CASCADE;
DROP TABLE IF EXISTS public.employee_activity_assignments CASCADE;
DROP TABLE IF EXISTS public.measures CASCADE;
DROP TABLE IF EXISTS public.incidents CASCADE;
DROP TABLE IF EXISTS public.activity_groups CASCADE;

DROP TYPE IF EXISTS public.investigation_status CASCADE;
DROP TYPE IF EXISTS public.incident_severity CASCADE;
DROP TYPE IF EXISTS public.incident_type CASCADE;
DROP TYPE IF EXISTS public.measure_status CASCADE;
DROP TYPE IF EXISTS public.measure_type CASCADE;

-- ============================================
-- CREATE ENUMS
-- ============================================
CREATE TYPE public.measure_type AS ENUM ('preventive', 'corrective', 'improvement');
CREATE TYPE public.measure_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.incident_type AS ENUM ('injury', 'near_miss', 'property_damage', 'environmental', 'other');
CREATE TYPE public.incident_severity AS ENUM ('minor', 'moderate', 'serious', 'critical', 'fatal');

-- ============================================
-- ACTIVITY GROUPS TABLE
-- ============================================
CREATE TABLE public.activity_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hazards TEXT[], -- Array of hazard descriptions
    required_ppe TEXT[], -- Required personal protective equipment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_activity_groups_company ON public.activity_groups(company_id);
CREATE INDEX idx_activity_groups_name ON public.activity_groups(name);

COMMENT ON TABLE public.activity_groups IS 'Activity groups (Tätigkeiten) that employees perform with associated hazards and PPE requirements';
COMMENT ON COLUMN public.activity_groups.hazards IS 'Array of hazard descriptions associated with this activity';
COMMENT ON COLUMN public.activity_groups.required_ppe IS 'Required personal protective equipment for this activity';

-- ============================================
-- EMPLOYEE ACTIVITY ASSIGNMENTS
-- ============================================
CREATE TABLE public.employee_activity_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    activity_group_id UUID NOT NULL REFERENCES public.activity_groups(id) ON DELETE CASCADE,
    assigned_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_employee_activity UNIQUE(employee_id, activity_group_id)
);

CREATE INDEX idx_employee_activity_employee ON public.employee_activity_assignments(employee_id);
CREATE INDEX idx_employee_activity_group ON public.employee_activity_assignments(activity_group_id);

COMMENT ON TABLE public.employee_activity_assignments IS 'Links employees to their assigned activity groups';

-- ============================================
-- INCIDENTS TABLE (Create before Measures due to FK)
-- ============================================
CREATE TABLE public.incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    incident_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Incident Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    incident_type public.incident_type NOT NULL,
    severity public.incident_severity NOT NULL,
    
    -- When & Where
    incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(255),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    
    -- Who
    affected_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    witness_ids UUID[], -- Array of employee IDs
    reported_by_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    
    -- Investigation
    root_cause TEXT,
    contributing_factors TEXT[],
    immediate_actions TEXT,
    
    -- Follow-up
    investigation_status VARCHAR(50) DEFAULT 'open' NOT NULL,
    investigation_completed_date DATE,
    
    -- Attachments
    attachments JSONB DEFAULT '[]'::jsonb NOT NULL,
    photos JSONB DEFAULT '[]'::jsonb NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_incidents_company ON public.incidents(company_id);
CREATE INDEX idx_incidents_date ON public.incidents(incident_date);
CREATE INDEX idx_incidents_type ON public.incidents(incident_type);
CREATE INDEX idx_incidents_severity ON public.incidents(severity);
CREATE INDEX idx_incidents_affected_employee ON public.incidents(affected_employee_id);
CREATE INDEX idx_incidents_department ON public.incidents(department_id);
CREATE INDEX idx_incidents_status ON public.incidents(investigation_status);
CREATE INDEX idx_incidents_number ON public.incidents(incident_number);

COMMENT ON TABLE public.incidents IS 'Workplace incidents, near misses, injuries, and safety events (Unfälle/Ereignisse)';
COMMENT ON COLUMN public.incidents.incident_number IS 'Auto-generated unique incident number in format YYYY-0001';
COMMENT ON COLUMN public.incidents.investigation_status IS 'Current status: open, in_progress, closed';

-- ============================================
-- MEASURES TABLE (Maßnahmen)
-- ============================================
CREATE TABLE public.measures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    measure_type public.measure_type DEFAULT 'corrective' NOT NULL,
    status public.measure_status DEFAULT 'planned' NOT NULL,
    
    -- Links to source
    risk_assessment_id UUID REFERENCES public.risk_assessments(id) ON DELETE SET NULL,
    audit_id UUID REFERENCES public.audits(id) ON DELETE SET NULL,
    incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
    
    -- Assignment
    responsible_person_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    due_date DATE,
    completion_date DATE,
    
    -- Evidence
    verification_method TEXT,
    attachments JSONB DEFAULT '[]'::jsonb NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID
);

CREATE INDEX idx_measures_company ON public.measures(company_id);
CREATE INDEX idx_measures_risk_assessment ON public.measures(risk_assessment_id);
CREATE INDEX idx_measures_audit ON public.measures(audit_id);
CREATE INDEX idx_measures_incident ON public.measures(incident_id);
CREATE INDEX idx_measures_responsible ON public.measures(responsible_person_id);
CREATE INDEX idx_measures_status ON public.measures(status);
CREATE INDEX idx_measures_type ON public.measures(measure_type);
CREATE INDEX idx_measures_due_date ON public.measures(due_date);

COMMENT ON TABLE public.measures IS 'Corrective and preventive measures (Maßnahmen) from risks, audits, and incidents';
COMMENT ON COLUMN public.measures.measure_type IS 'Type: preventive, corrective, or improvement';
COMMENT ON COLUMN public.measures.status IS 'Status: planned, in_progress, completed, or cancelled';

-- ============================================
-- ACTIVITY RISK LINKS
-- ============================================
CREATE TABLE public.activity_risk_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_group_id UUID NOT NULL REFERENCES public.activity_groups(id) ON DELETE CASCADE,
    risk_assessment_id UUID NOT NULL REFERENCES public.risk_assessments(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_activity_risk UNIQUE(activity_group_id, risk_assessment_id)
);

CREATE INDEX idx_activity_risk_activity ON public.activity_risk_links(activity_group_id);
CREATE INDEX idx_activity_risk_assessment ON public.activity_risk_links(risk_assessment_id);
CREATE INDEX idx_activity_risk_company ON public.activity_risk_links(company_id);

COMMENT ON TABLE public.activity_risk_links IS 'Links activity groups to risk assessments for automation workflows';

-- ============================================
-- ACTIVITY TRAINING REQUIREMENTS
-- ============================================
CREATE TABLE public.activity_training_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_group_id UUID NOT NULL REFERENCES public.activity_groups(id) ON DELETE CASCADE,
    training_type_id UUID NOT NULL REFERENCES public.training_types(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_activity_training UNIQUE(activity_group_id, training_type_id)
);

CREATE INDEX idx_activity_training_activity ON public.activity_training_requirements(activity_group_id);
CREATE INDEX idx_activity_training_type ON public.activity_training_requirements(training_type_id);
CREATE INDEX idx_activity_training_company ON public.activity_training_requirements(company_id);

COMMENT ON TABLE public.activity_training_requirements IS 'Defines required training for each activity group';
COMMENT ON COLUMN public.activity_training_requirements.is_mandatory IS 'Whether this training is mandatory for employees assigned to this activity';

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Activity Groups RLS
ALTER TABLE public.activity_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_groups_select_policy" ON public.activity_groups
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "activity_groups_insert_policy" ON public.activity_groups
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

CREATE POLICY "activity_groups_update_policy" ON public.activity_groups
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

CREATE POLICY "activity_groups_delete_policy" ON public.activity_groups
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

-- Employee Activity Assignments RLS
ALTER TABLE public.employee_activity_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_activity_assignments_select_policy" ON public.employee_activity_assignments
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM public.employees WHERE company_id IN (
                SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "employee_activity_assignments_manage_policy" ON public.employee_activity_assignments
    FOR ALL USING (
        employee_id IN (
            SELECT id FROM public.employees WHERE company_id IN (
                SELECT company_id FROM public.user_roles 
                WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
            )
        )
    );

-- Measures RLS
ALTER TABLE public.measures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "measures_select_policy" ON public.measures
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "measures_insert_policy" ON public.measures
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'employee', 'super_admin')
        )
    );

CREATE POLICY "measures_update_policy" ON public.measures
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
        OR responsible_person_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "measures_delete_policy" ON public.measures
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

-- Incidents RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incidents_select_policy" ON public.incidents
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "incidents_insert_policy" ON public.incidents
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'employee', 'super_admin')
        )
    );

CREATE POLICY "incidents_update_policy" ON public.incidents
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

CREATE POLICY "incidents_delete_policy" ON public.incidents
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

-- Activity Risk Links RLS
ALTER TABLE public.activity_risk_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_risk_links_select_policy" ON public.activity_risk_links
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "activity_risk_links_manage_policy" ON public.activity_risk_links
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

-- Activity Training Requirements RLS
ALTER TABLE public.activity_training_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_training_requirements_select_policy" ON public.activity_training_requirements
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "activity_training_requirements_manage_policy" ON public.activity_training_requirements
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

-- ============================================
-- AUTOMATION FUNCTIONS & TRIGGERS
-- ============================================

-- Function to auto-generate incident number
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    year_prefix VARCHAR(4);
BEGIN
    -- Only generate if incident_number is null or empty
    IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
        year_prefix := to_char(NEW.incident_date, 'YYYY');
        
        -- Get the next number for this year and company
        SELECT COALESCE(MAX(CAST(SUBSTRING(incident_number FROM 6) AS INTEGER)), 0) + 1
        INTO next_number
        FROM public.incidents
        WHERE company_id = NEW.company_id
        AND incident_number LIKE year_prefix || '-%';
        
        -- Format: YYYY-0001
        NEW.incident_number := year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_incident_number
    BEFORE INSERT ON public.incidents
    FOR EACH ROW
    EXECUTE FUNCTION generate_incident_number();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_activity_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_risk_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_training_requirements TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Uncomment to verify tables were created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('activity_groups', 'employee_activity_assignments', 'measures', 'incidents', 'activity_risk_links', 'activity_training_requirements');

-- Uncomment to verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('activity_groups', 'employee_activity_assignments', 'measures', 'incidents', 'activity_risk_links', 'activity_training_requirements');

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ HSE Management System database setup completed successfully!';
    RAISE NOTICE '   - 6 tables created: activity_groups, employee_activity_assignments, measures, incidents, activity_risk_links, activity_training_requirements';
    RAISE NOTICE '   - 4 enum types created: measure_type, measure_status, incident_type, incident_severity';
    RAISE NOTICE '   - RLS policies enabled on all tables';
    RAISE NOTICE '   - Automation trigger created for incident numbering';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Regenerate TypeScript types: npx supabase gen types typescript';
    RAISE NOTICE '   2. Restart your development server';
    RAISE NOTICE '   3. Test CRUD operations on new modules';
END $$;
