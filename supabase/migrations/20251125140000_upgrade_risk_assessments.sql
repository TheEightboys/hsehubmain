-- Upgrade risk_assessments module with new fields and tables

-- 1. Create locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    company_id UUID REFERENCES public.companies (id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW (),
    updated_at TIMESTAMPTZ DEFAULT NOW ()
);

CREATE INDEX IF NOT EXISTS idx_locations_company ON public.locations (company_id);

-- Enable RLS for locations
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations_select_policy" ON public.locations;

CREATE POLICY "locations_select_policy" ON public.locations FOR
SELECT TO authenticated USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "locations_insert_policy" ON public.locations;

CREATE POLICY "locations_insert_policy" ON public.locations
FOR INSERT TO authenticated
WITH CHECK (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('owner', 'admin', 'manager')));

DROP POLICY IF EXISTS "locations_update_policy" ON public.locations;

CREATE POLICY "locations_update_policy" ON public.locations
FOR UPDATE TO authenticated
USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('owner', 'admin', 'manager')));

DROP POLICY IF EXISTS "locations_delete_policy" ON public.locations;

CREATE POLICY "locations_delete_policy" ON public.locations
FOR DELETE TO authenticated
USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('owner', 'admin')));

GRANT
SELECT, INSERT,
UPDATE, DELETE ON public.locations TO authenticated;

-- 2. Create risk_assessment_measures table
CREATE TABLE IF NOT EXISTS public.risk_assessment_measures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    risk_assessment_id UUID REFERENCES public.risk_assessments (id) ON DELETE CASCADE NOT NULL,
    company_id UUID REFERENCES public.companies (id) ON DELETE CASCADE NOT NULL,
    measure_building_block TEXT NOT NULL,
    responsible_person UUID REFERENCES public.employees (id) ON DELETE SET NULL,
    responsible_person_name TEXT,
    due_date DATE,
    progress_status TEXT DEFAULT 'not_started' CHECK (
        progress_status IN (
            'not_started',
            'in_progress',
            'completed',
            'blocked'
        )
    ),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW (),
    updated_at TIMESTAMPTZ DEFAULT NOW ()
);

CREATE INDEX IF NOT EXISTS idx_measures_risk_assessment ON public.risk_assessment_measures (risk_assessment_id);

CREATE INDEX IF NOT EXISTS idx_measures_company ON public.risk_assessment_measures (company_id);

CREATE INDEX IF NOT EXISTS idx_measures_responsible ON public.risk_assessment_measures (responsible_person);

-- Enable RLS for measures
ALTER TABLE public.risk_assessment_measures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "measures_select_policy" ON public.risk_assessment_measures;

CREATE POLICY "measures_select_policy" ON public.risk_assessment_measures FOR
SELECT TO authenticated USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

DROP POLICY IF EXISTS "measures_insert_policy" ON public.risk_assessment_measures;

CREATE POLICY "measures_insert_policy" ON public.risk_assessment_measures
FOR INSERT TO authenticated
WITH CHECK (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('owner', 'admin', 'manager', 'employee')));

DROP POLICY IF EXISTS "measures_update_policy" ON public.risk_assessment_measures;

CREATE POLICY "measures_update_policy" ON public.risk_assessment_measures
FOR UPDATE TO authenticated
USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('owner', 'admin', 'manager', 'employee')));

DROP POLICY IF EXISTS "measures_delete_policy" ON public.risk_assessment_measures;

CREATE POLICY "measures_delete_policy" ON public.risk_assessment_measures
FOR DELETE TO authenticated
USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text IN ('owner', 'admin', 'manager')));

GRANT
SELECT, INSERT,
UPDATE, DELETE ON public.risk_assessment_measures TO authenticated;

-- 3. Add new fields to risk_assessments table
ALTER TABLE public.risk_assessments
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS exposure_group_id UUID REFERENCES public.exposure_groups (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS line_manager_id UUID REFERENCES public.employees (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hazard_category TEXT,
ADD COLUMN IF NOT EXISTS probability_before INTEGER CHECK (
    probability_before >= 1
    AND probability_before <= 5
),
ADD COLUMN IF NOT EXISTS probability_after INTEGER CHECK (
    probability_after >= 1
    AND probability_after <= 5
),
ADD COLUMN IF NOT EXISTS extent_damage_before INTEGER CHECK (
    extent_damage_before >= 1
    AND extent_damage_before <= 5
),
ADD COLUMN IF NOT EXISTS extent_damage_after INTEGER CHECK (
    extent_damage_after >= 1
    AND extent_damage_after <= 5
),
ADD COLUMN IF NOT EXISTS risk_score_before INTEGER GENERATED ALWAYS AS (
    probability_before * extent_damage_before
) STORED,
ADD COLUMN IF NOT EXISTS risk_score_after INTEGER GENERATED ALWAYS AS (
    probability_after * extent_damage_after
) STORED,
ADD COLUMN IF NOT EXISTS risk_matrix_label TEXT,
ADD COLUMN IF NOT EXISTS document_paths TEXT [], -- Array of document file paths
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (
    progress >= 0
    AND progress <= 100
),
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft' CHECK (
    approval_status IN (
        'draft',
        'pending_approval',
        'approved',
        'rejected'
    )
),
ADD COLUMN IF NOT EXISTS approval_comment TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.employees (id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_risk_assessments_location ON public.risk_assessments (location_id);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_exposure_group ON public.risk_assessments (exposure_group_id);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_line_manager ON public.risk_assessments (line_manager_id);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_approved_by ON public.risk_assessments (approved_by);

-- Add comments
COMMENT ON COLUMN public.risk_assessments.probability_before IS 'Probability rating before mitigation (1-5)';

COMMENT ON COLUMN public.risk_assessments.probability_after IS 'Probability rating after mitigation (1-5)';

COMMENT ON COLUMN public.risk_assessments.extent_damage_before IS 'Extent of damage before mitigation (1-5)';

COMMENT ON COLUMN public.risk_assessments.extent_damage_after IS 'Extent of damage after mitigation (1-5)';

COMMENT ON COLUMN public.risk_assessments.risk_score_before IS 'Auto-calculated risk score before mitigation';

COMMENT ON COLUMN public.risk_assessments.risk_score_after IS 'Auto-calculated risk score after mitigation';

COMMENT ON COLUMN public.risk_assessments.progress IS 'Overall progress percentage (0-100)';

COMMENT ON COLUMN public.risk_assessments.approval_status IS 'Approval workflow status';

COMMENT ON COLUMN public.risk_assessments.document_paths IS 'Array of uploaded document file paths';

-- 4. Create function to update risk assessment progress based on measures
CREATE OR REPLACE FUNCTION update_risk_assessment_progress()
RETURNS TRIGGER AS $$
DECLARE
    total_measures INTEGER;
    completed_measures INTEGER;
    progress_percentage INTEGER;
BEGIN
    -- Count total and completed measures for the risk assessment
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN progress_status = 'completed' THEN 1 END)
    INTO total_measures, completed_measures
    FROM public.risk_assessment_measures
    WHERE risk_assessment_id = COALESCE(NEW.risk_assessment_id, OLD.risk_assessment_id);
    
    -- Calculate progress percentage
    IF total_measures > 0 THEN
        progress_percentage := (completed_measures * 100) / total_measures;
    ELSE
        progress_percentage := 0;
    END IF;
    
    -- Update the risk assessment progress
    UPDATE public.risk_assessments
    SET progress = progress_percentage,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.risk_assessment_id, OLD.risk_assessment_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger to auto-update progress
DROP TRIGGER IF EXISTS trigger_update_risk_progress ON public.risk_assessment_measures;

CREATE TRIGGER trigger_update_risk_progress
AFTER INSERT OR UPDATE OR DELETE ON public.risk_assessment_measures
FOR EACH ROW
EXECUTE FUNCTION update_risk_assessment_progress();

-- 6. Add sample hazard categories (optional - client can customize)
COMMENT ON COLUMN public.risk_assessments.hazard_category IS 'Hazard category from predefined list';