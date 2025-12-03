-- ============================================
-- FIX CHECK-UPS MODULE - Allow direct G-code storage
-- Modifies health_checkups to store investigation name directly
-- ============================================

-- Add investigation_name column to store G-codes directly
ALTER TABLE public.health_checkups 
ADD COLUMN IF NOT EXISTS investigation_name VARCHAR(255);

-- Make investigation_id nullable since we'll use investigation_name instead
ALTER TABLE public.health_checkups 
ALTER COLUMN investigation_id DROP NOT NULL;

-- Add index for investigation_name
CREATE INDEX IF NOT EXISTS idx_health_checkups_investigation_name 
ON public.health_checkups(investigation_name);

COMMENT ON COLUMN public.health_checkups.investigation_name IS 'G-Investigation code and name (e.g., "G 8 – Benzol")';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Check-ups Module fix applied successfully!';
    RAISE NOTICE '   - Added investigation_name column';
    RAISE NOTICE '   - Made investigation_id nullable';
    RAISE NOTICE '   - Can now store G-codes directly without foreign key';
END $$;
