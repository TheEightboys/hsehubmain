-- ============================================
-- ADD MEDICAL INVESTIGATION FIELDS TO INVESTIGATIONS TABLE
-- Adds columns needed for G-Investigations (medical checkups)
-- ============================================

-- Add medical investigation fields
ALTER TABLE public.investigations
ADD COLUMN IF NOT EXISTS g_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS appointment_date DATE,
ADD COLUMN IF NOT EXISTS doctor VARCHAR(255);

-- Update status check constraint to include medical investigation statuses
ALTER TABLE public.investigations
DROP CONSTRAINT IF EXISTS investigations_status_check;

ALTER TABLE public.investigations
ADD CONSTRAINT investigations_status_check CHECK (
    status IN (
        'open',
        'in_progress',
        'completed',
        'closed',
        'due',
        'planned'
    )
);

-- Add indexes for medical fields
CREATE INDEX IF NOT EXISTS idx_investigations_g_code ON public.investigations (g_code);

CREATE INDEX IF NOT EXISTS idx_investigations_due_date ON public.investigations (due_date);

CREATE INDEX IF NOT EXISTS idx_investigations_appointment_date ON public.investigations (appointment_date);

-- Add comments
COMMENT ON COLUMN public.investigations.g_code IS 'G-Code for medical investigations (e.g., G37, G11, G7)';

COMMENT ON COLUMN public.investigations.due_date IS 'Due date for medical investigation';

COMMENT ON COLUMN public.investigations.appointment_date IS 'Scheduled appointment date for medical investigation';

COMMENT ON COLUMN public.investigations.doctor IS 'Doctor name for medical investigation';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Medical investigation fields added to investigations table successfully!';
    RAISE NOTICE '   - Added g_code column';
    RAISE NOTICE '   - Added due_date column';
    RAISE NOTICE '   - Added appointment_date column';
    RAISE NOTICE '   - Added doctor column';
    RAISE NOTICE '   - Updated status constraint to include medical statuses (due, planned)';
    RAISE NOTICE '   - Added indexes for performance';
END $$;