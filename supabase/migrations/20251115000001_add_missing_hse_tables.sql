-- Migration: Add missing HSE tables for complete system
-- Activity Groups, Measures, Incidents, and Employee Assignments

-- ============================================
-- ACTIVITY GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hazards TEXT[], -- Array of hazard descriptions
    required_ppe TEXT[], -- Required personal protective equipment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_activity_groups_company ON public.activity_groups(company_id);

-- ============================================
-- EMPLOYEE ACTIVITY ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.employee_activity_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    activity_group_id UUID NOT NULL REFERENCES public.activity_groups(id) ON DELETE CASCADE,
    assigned_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(employee_id, activity_group_id)
);

CREATE INDEX idx_employee_activity_employee ON public.employee_activity_assignments(employee_id);
CREATE INDEX idx_employee_activity_group ON public.employee_activity_assignments(activity_group_id);

-- ============================================
-- MEASURES TABLE (Maßnahmen)
-- ============================================
CREATE TYPE public.measure_type AS ENUM ('preventive', 'corrective', 'improvement');
CREATE TYPE public.measure_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.measures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    measure_type public.measure_type DEFAULT 'corrective',
    status public.measure_status DEFAULT 'planned',
    
    -- Links to source
    risk_assessment_id UUID REFERENCES public.risk_assessments(id) ON DELETE SET NULL,
    audit_id UUID REFERENCES public.audits(id) ON DELETE SET NULL,
    incident_id UUID, -- Will reference incidents table
    
    -- Assignment
    responsible_person_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    due_date DATE,
    completion_date DATE,
    
    -- Evidence
    verification_method TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID
);

CREATE INDEX idx_measures_company ON public.measures(company_id);
CREATE INDEX idx_measures_risk_assessment ON public.measures(risk_assessment_id);
CREATE INDEX idx_measures_audit ON public.measures(audit_id);
CREATE INDEX idx_measures_responsible ON public.measures(responsible_person_id);
CREATE INDEX idx_measures_status ON public.measures(status);

-- ============================================
-- INCIDENTS TABLE (Unfälle/Ereignisse)
-- ============================================
CREATE TYPE public.incident_type AS ENUM ('injury', 'near_miss', 'property_damage', 'environmental', 'other');
CREATE TYPE public.incident_severity AS ENUM ('minor', 'moderate', 'serious', 'critical', 'fatal');

CREATE TABLE IF NOT EXISTS public.incidents (
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
    investigation_status VARCHAR(50) DEFAULT 'open',
    investigation_completed_date DATE,
    
    -- Attachments
    attachments JSONB DEFAULT '[]'::jsonb,
    photos JSONB DEFAULT '[]'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_incidents_company ON public.incidents(company_id);
CREATE INDEX idx_incidents_date ON public.incidents(incident_date);
CREATE INDEX idx_incidents_type ON public.incidents(incident_type);
CREATE INDEX idx_incidents_affected_employee ON public.incidents(affected_employee_id);
CREATE INDEX idx_incidents_department ON public.incidents(department_id);

-- Now we can add the foreign key for measures.incident_id
ALTER TABLE public.measures
ADD CONSTRAINT fk_measures_incident
FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE SET NULL;

-- ============================================
-- ACTIVITY RISK LINKS
-- ============================================
-- Link activity groups to risk assessments for automation
CREATE TABLE IF NOT EXISTS public.activity_risk_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_group_id UUID NOT NULL REFERENCES public.activity_groups(id) ON DELETE CASCADE,
    risk_assessment_id UUID NOT NULL REFERENCES public.risk_assessments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(activity_group_id, risk_assessment_id)
);

CREATE INDEX idx_activity_risk_activity ON public.activity_risk_links(activity_group_id);
CREATE INDEX idx_activity_risk_assessment ON public.activity_risk_links(risk_assessment_id);

-- ============================================
-- ACTIVITY TRAINING REQUIREMENTS
-- ============================================
-- Define what training is required for each activity
CREATE TABLE IF NOT EXISTS public.activity_training_requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_group_id UUID NOT NULL REFERENCES public.activity_groups(id) ON DELETE CASCADE,
    training_type_id UUID NOT NULL REFERENCES public.training_types(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(activity_group_id, training_type_id)
);

CREATE INDEX idx_activity_training_activity ON public.activity_training_requirements(activity_group_id);
CREATE INDEX idx_activity_training_type ON public.activity_training_requirements(training_type_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activity Groups RLS
ALTER TABLE public.activity_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_groups_select" ON public.activity_groups
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "activity_groups_insert" ON public.activity_groups
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

CREATE POLICY "activity_groups_update" ON public.activity_groups
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

CREATE POLICY "activity_groups_delete" ON public.activity_groups
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

-- Employee Activity Assignments RLS
ALTER TABLE public.employee_activity_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_activity_assignments_select" ON public.employee_activity_assignments
    FOR SELECT USING (
        employee_id IN (
            SELECT id FROM public.employees WHERE company_id IN (
                SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "employee_activity_assignments_manage" ON public.employee_activity_assignments
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

CREATE POLICY "measures_select" ON public.measures
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "measures_insert" ON public.measures
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'employee', 'super_admin')
        )
    );

CREATE POLICY "measures_update" ON public.measures
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
        OR responsible_person_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "measures_delete" ON public.measures
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

-- Incidents RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incidents_select" ON public.incidents
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "incidents_insert" ON public.incidents
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'employee', 'super_admin')
        )
    );

CREATE POLICY "incidents_update" ON public.incidents
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

CREATE POLICY "incidents_delete" ON public.incidents
    FOR DELETE USING (
        company_id IN (
            SELECT company_id FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
        )
    );

-- Activity Risk Links RLS
ALTER TABLE public.activity_risk_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_risk_links_select" ON public.activity_risk_links
    FOR SELECT USING (
        activity_group_id IN (
            SELECT id FROM public.activity_groups WHERE company_id IN (
                SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "activity_risk_links_manage" ON public.activity_risk_links
    FOR ALL USING (
        activity_group_id IN (
            SELECT id FROM public.activity_groups WHERE company_id IN (
                SELECT company_id FROM public.user_roles 
                WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
            )
        )
    );

-- Activity Training Requirements RLS
ALTER TABLE public.activity_training_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_training_requirements_select" ON public.activity_training_requirements
    FOR SELECT USING (
        activity_group_id IN (
            SELECT id FROM public.activity_groups WHERE company_id IN (
                SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "activity_training_requirements_manage" ON public.activity_training_requirements
    FOR ALL USING (
        activity_group_id IN (
            SELECT id FROM public.activity_groups WHERE company_id IN (
                SELECT company_id FROM public.user_roles 
                WHERE user_id = auth.uid() AND role IN ('company_admin', 'super_admin')
            )
        )
    );

-- ============================================
-- AUTOMATION FUNCTIONS
-- ============================================

-- Function to auto-generate incident number
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    year_prefix VARCHAR(4);
BEGIN
    year_prefix := to_char(NEW.incident_date, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(incident_number FROM 6) AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.incidents
    WHERE company_id = NEW.company_id
    AND incident_number LIKE year_prefix || '-%';
    
    NEW.incident_number := year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_incident_number
    BEFORE INSERT ON public.incidents
    FOR EACH ROW
    WHEN (NEW.incident_number IS NULL OR NEW.incident_number = '')
    EXECUTE FUNCTION generate_incident_number();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.activity_groups IS 'Activity groups (Tätigkeiten) that employees perform';
COMMENT ON TABLE public.measures IS 'Corrective and preventive measures (Maßnahmen) from risks, audits, and incidents';
COMMENT ON TABLE public.incidents IS 'Workplace incidents, near misses, and injuries (Unfälle/Ereignisse)';
COMMENT ON TABLE public.employee_activity_assignments IS 'Links employees to their activity groups';
COMMENT ON TABLE public.activity_risk_links IS 'Links activity groups to risk assessments for automation';
COMMENT ON TABLE public.activity_training_requirements IS 'Defines required training for each activity group';
