-- ============================================
-- FINAL FIX: Make incident_number nullable and clean up
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Delete any incidents with empty or NULL incident_number
DELETE FROM public.incidents 
WHERE incident_number IS NULL 
   OR incident_number = '' 
   OR TRIM(incident_number) = '';

-- Step 2: Make incident_number nullable (remove NOT NULL constraint)
-- This makes the system more forgiving
ALTER TABLE public.incidents 
ALTER COLUMN incident_number DROP NOT NULL;

-- Step 3: Drop the old trigger (we're using application-level generation now)
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

-- Step 5: Check existing incidents
SELECT incident_number, title, created_at 
FROM public.incidents 
ORDER BY created_at DESC 
LIMIT 10;

-- ============================================
-- SUCCESS!
-- ============================================
-- Now the application code will handle incident number generation
-- No more database trigger conflicts!
