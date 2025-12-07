-- Fix RLS Policies for ISO Criteria Tables
-- This allows authenticated users to insert ISO criteria data

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view ISO sections" ON iso_criteria_sections;
DROP POLICY IF EXISTS "Anyone can view ISO subsections" ON iso_criteria_subsections;
DROP POLICY IF EXISTS "Anyone can view ISO questions" ON iso_criteria_questions;

-- Create new policies that allow both SELECT and INSERT for authenticated users
-- Sections
CREATE POLICY "Authenticated users can view ISO sections"
  ON iso_criteria_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ISO sections"
  ON iso_criteria_sections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ISO sections"
  ON iso_criteria_sections FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Subsections
CREATE POLICY "Authenticated users can view ISO subsections"
  ON iso_criteria_subsections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ISO subsections"
  ON iso_criteria_subsections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ISO subsections"
  ON iso_criteria_subsections FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Questions
CREATE POLICY "Authenticated users can view ISO questions"
  ON iso_criteria_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ISO questions"
  ON iso_criteria_questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ISO questions"
  ON iso_criteria_questions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
