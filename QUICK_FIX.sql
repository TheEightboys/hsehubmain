-- ============================================
-- QUICK FIX: Delete incidents with empty incident_number
-- Run this in Supabase SQL Editor NOW
-- ============================================

-- Step 1: See the problematic records
SELECT id, incident_number, title, created_at 
FROM public.incidents 
WHERE incident_number IS NULL OR incident_number = '' OR TRIM(incident_number) = '';

-- Step 2: Delete them (they're blocking new inserts)
DELETE FROM public.incidents 
WHERE incident_number IS NULL OR incident_number = '' OR TRIM(incident_number) = '';

-- Step 3: Verify they're gone
SELECT COUNT(*) as empty_incident_numbers
FROM public.incidents 
WHERE incident_number IS NULL OR incident_number = '';

-- You should see 0

-- ============================================
-- Now try creating the incident again!
-- ============================================
