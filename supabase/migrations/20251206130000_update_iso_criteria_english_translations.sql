-- Update existing ISO criteria data to populate English translation columns
-- This migration copies the existing English text from the default columns to the _en columns

-- Update sections: copy title to title_en
UPDATE iso_criteria_sections 
SET title_en = title 
WHERE title_en IS NULL OR title_en = '';

-- Update subsections: copy title to title_en
UPDATE iso_criteria_subsections 
SET title_en = title 
WHERE title_en IS NULL OR title_en = '';

-- Update questions: copy question_text to question_text_en
UPDATE iso_criteria_questions 
SET question_text_en = question_text 
WHERE question_text_en IS NULL OR question_text_en = '';

-- Add comments
COMMENT ON COLUMN iso_criteria_sections.title_en IS 'English translation - populated from existing English data';
COMMENT ON COLUMN iso_criteria_subsections.title_en IS 'English translation - populated from existing English data';
COMMENT ON COLUMN iso_criteria_questions.question_text_en IS 'English translation - populated from existing English data';
