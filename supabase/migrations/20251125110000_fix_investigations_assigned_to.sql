-- ============================================
-- FIX INVESTIGATIONS TABLE - Add all missing columns
-- ============================================

-- Add all missing columns to investigations table
ALTER TABLE public.investigations 
ADD COLUMN IF NOT EXISTS investigation_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS related_incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'closed')),
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS findings TEXT,
ADD COLUMN IF NOT EXISTS recommendations TEXT;

-- Make 'name' column nullable since the code doesn't use it
ALTER TABLE public.investigations 
ALTER COLUMN name DROP NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_investigations_investigation_id ON public.investigations(investigation_id);
CREATE INDEX IF NOT EXISTS idx_investigations_assigned_to ON public.investigations(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_investigations_status ON public.investigations(status);
CREATE INDEX IF NOT EXISTS idx_investigations_priority ON public.investigations(priority);
CREATE INDEX IF NOT EXISTS idx_investigations_related_incident ON public.investigations(related_incident_id);

-- Add comments
COMMENT ON COLUMN public.investigations.investigation_id IS 'Unique investigation identifier (e.g., INV-202511-001)';
COMMENT ON COLUMN public.investigations.related_incident_id IS 'Related incident if investigation is incident-based';
COMMENT ON COLUMN public.investigations.start_date IS 'Investigation start date';
COMMENT ON COLUMN public.investigations.assigned_to_id IS 'Employee assigned to this investigation';
COMMENT ON COLUMN public.investigations.status IS 'Investigation status: open, in_progress, completed, closed';
COMMENT ON COLUMN public.investigations.priority IS 'Investigation priority: low, medium, high, critical';
COMMENT ON COLUMN public.investigations.description IS 'Investigation description';
COMMENT ON COLUMN public.investigations.findings IS 'Investigation findings';
COMMENT ON COLUMN public.investigations.recommendations IS 'Investigation recommendations';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Investigations table fix applied successfully!';
    RAISE NOTICE '   - Added investigation_id column';
    RAISE NOTICE '   - Added related_incident_id column';
    RAISE NOTICE '   - Added start_date column';
    RAISE NOTICE '   - Added assigned_to_id column';
    RAISE NOTICE '   - Added status column';
    RAISE NOTICE '   - Added priority column';
    RAISE NOTICE '   - Added description column';
    RAISE NOTICE '   - Added findings column';
    RAISE NOTICE '   - Added recommendations column';
    RAISE NOTICE '   - Added indexes for performance';
END $$;
