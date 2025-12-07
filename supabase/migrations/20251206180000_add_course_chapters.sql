-- Add Course Chapters Support
-- This migration adds chapter hierarchy support to the course management system
-- and updates the lesson_type enum to include iframe

-- Add parent_id to course_lessons for chapter hierarchy
ALTER TABLE public.course_lessons 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE;

-- Update lesson_type enum to include iframe and remove deprecated types
-- First, create the new enum type
DO $$ 
BEGIN
  -- Check if the new enum already exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_type_new') THEN
    CREATE TYPE public.lesson_type_new AS ENUM ('subchapter', 'video_audio', 'pdf', 'text', 'iframe');
  END IF;
END $$;

-- Migrate existing data
-- Convert website_link to iframe and zip_file to pdf
ALTER TABLE public.course_lessons 
  ALTER COLUMN type TYPE public.lesson_type_new 
  USING (
    CASE 
      WHEN type::text = 'website_link' THEN 'iframe'::lesson_type_new
      WHEN type::text = 'zip_file' THEN 'pdf'::lesson_type_new
      ELSE type::text::lesson_type_new
    END
  );

-- Drop old enum and rename new one
DROP TYPE IF EXISTS public.lesson_type CASCADE;
ALTER TYPE public.lesson_type_new RENAME TO lesson_type;

-- Add index for parent_id to improve query performance
CREATE INDEX IF NOT EXISTS idx_course_lessons_parent_id ON public.course_lessons(parent_id);

-- Add comment to document the parent_id column
COMMENT ON COLUMN public.course_lessons.parent_id IS 'References parent lesson for chapter hierarchy. NULL for top-level lessons.';
