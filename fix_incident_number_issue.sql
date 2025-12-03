-- ============================================
-- FIX INCIDENT NUMBER ISSUE
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check for existing incidents with empty or NULL incident_number
SELECT id, incident_number, title, created_at 
FROM public.incidents 
WHERE incident_number IS NULL OR incident_number = '' OR incident_number = 'null'
ORDER BY created_at;

-- Step 2: Check if the trigger exists
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_generate_incident_number';

-- Step 3: Check if the function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'generate_incident_number';

-- ============================================
-- CLEANUP AND FIX
-- ============================================

-- Step 4: Delete incidents with empty incident_number (if any exist from failed inserts)
-- UNCOMMENT ONLY IF YOU WANT TO DELETE THESE RECORDS:
-- DELETE FROM public.incidents 
-- WHERE incident_number IS NULL OR incident_number = '';

-- Step 5: OR Update existing incidents with empty incident_number to have proper numbers
-- UNCOMMENT TO RUN THIS UPDATE:
-- DO $$
-- DECLARE
--     incident_record RECORD;
--     next_number INTEGER;
--     year_prefix VARCHAR(4);
--     new_incident_number VARCHAR(50);
-- BEGIN
--     FOR incident_record IN 
--         SELECT id, incident_date, company_id 
--         FROM public.incidents 
--         WHERE incident_number IS NULL OR incident_number = ''
--         ORDER BY created_at
--     LOOP
--         year_prefix := to_char(incident_record.incident_date, 'YYYY');
--         
--         SELECT COALESCE(MAX(CAST(SUBSTRING(incident_number FROM 6) AS INTEGER)), 0) + 1
--         INTO next_number
--         FROM public.incidents
--         WHERE company_id = incident_record.company_id
--         AND incident_number LIKE year_prefix || '-%'
--         AND incident_number IS NOT NULL 
--         AND incident_number != '';
--         
--         new_incident_number := year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
--         
--         UPDATE public.incidents 
--         SET incident_number = new_incident_number
--         WHERE id = incident_record.id;
--         
--         RAISE NOTICE 'Updated incident % with number %', incident_record.id, new_incident_number;
--     END LOOP;
-- END $$;

-- ============================================
-- RECREATE TRIGGER (if it doesn't exist)
-- ============================================

-- Drop existing trigger and function (if any)
DROP TRIGGER IF EXISTS trigger_generate_incident_number ON public.incidents;
DROP FUNCTION IF EXISTS generate_incident_number();

-- Recreate the function
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
        AND incident_number LIKE year_prefix || '-%'
        AND incident_number IS NOT NULL
        AND incident_number != '';
        
        -- Format: YYYY-0001
        NEW.incident_number := year_prefix || '-' || LPAD(next_number::TEXT, 4, '0');
        
        RAISE NOTICE 'Generated incident number: %', NEW.incident_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_generate_incident_number
    BEFORE INSERT ON public.incidents
    FOR EACH ROW
    EXECUTE FUNCTION generate_incident_number();

-- Verify trigger was created
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_generate_incident_number';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger recreated successfully!';
    RAISE NOTICE 'Try creating a new incident now.';
END $$;
