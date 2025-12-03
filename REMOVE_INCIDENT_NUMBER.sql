-- ============================================
-- REMOVE INCIDENT NUMBER REQUIREMENT
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Make incident_number nullable (optional)
ALTER TABLE public.incidents 
ALTER COLUMN incident_number DROP NOT NULL;

-- Step 2: Remove the UNIQUE constraint on incident_number
ALTER TABLE public.incidents 
DROP CONSTRAINT IF EXISTS incidents_incident_number_key;

-- Step 3: Remove the trigger (not needed anymore)
DROP TRIGGER IF EXISTS trigger_generate_incident_number ON public.incidents;
DROP FUNCTION IF EXISTS generate_incident_number();

-- Step 4: Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'incidents' 
AND column_name = 'incident_number';

-- Should show is_nullable = 'YES'

-- Step 5: Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'incidents'
AND constraint_name LIKE '%incident_number%';

-- Should return no rows (constraint removed)

-- ============================================
-- SUCCESS!
-- ============================================
-- Now incidents can be created without incident_number
-- The field is optional and won't cause any errors
