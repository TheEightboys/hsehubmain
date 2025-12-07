-- SQL script to manually set English translations for ISO 45001
-- Run this in your Supabase SQL Editor

-- Update ISO 45001 sections with English titles
UPDATE iso_criteria_sections 
SET title_en = CASE section_number
  WHEN '1' THEN 'Context of the Organization'
  WHEN '2' THEN 'Leadership'
  WHEN '3' THEN 'Planning'
  WHEN '4' THEN 'Support'
  WHEN '5' THEN 'Operation'
  WHEN '6' THEN 'Performance Evaluation'
  WHEN '7' THEN 'Improvement'
  WHEN '8' THEN 'Glossary'
END
WHERE iso_code = 'ISO_45001' AND section_number IN ('1','2','3','4','5','6','7','8');

-- Update ISO 45001 subsections with English titles (sample - you'll need to add more)
UPDATE iso_criteria_subsections 
SET title_en = CASE subsection_number
  WHEN '1.1' THEN 'Identify External and Internal Issues'
  WHEN '1.2' THEN 'Interested Parties and Their Requirements'
  WHEN '1.3' THEN 'Scope of the OHS Management System'
  WHEN '1.4' THEN 'Management System and Interfaces'
  WHEN '2.1' THEN 'Responsibility and Commitment of Top Management'
  WHEN '2.2' THEN 'Occupational Health and Safety Policy'
  WHEN '2.3' THEN 'Roles, Responsibilities and Authorities'
  WHEN '2.4' THEN 'Participation and Consultation of Workers'
  WHEN '2.5' THEN 'Special Officers and Expert Functions'
  WHEN '3.1' THEN 'Actions to Address Risks and Opportunities'
  WHEN '3.2' THEN 'Legal and Other Requirements'
  WHEN '3.3' THEN 'Occupational Health and Safety Objectives'
  WHEN '3.4' THEN 'Emergency and Crisis Planning'
  WHEN '3.6' THEN 'Detailed Objective Planning'
  -- Add more subsections as needed
END
WHERE subsection_number IN ('1.1','1.2','1.3','1.4','2.1','2.2','2.3','2.4','2.5','3.1','3.2','3.3','3.4','3.6');

-- Note: For questions, you'll need to update them individually or create a more comprehensive script
-- This is just a starting point to get the main sections and subsections translated
