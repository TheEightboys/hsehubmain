-- Create course management system tables
-- This migration adds support for creating and managing training courses with lessons

-- Create enum for lesson types
CREATE TYPE public.lesson_type AS ENUM ('subchapter', 'video_audio', 'pdf', 'text', 'iframe');

-- Create enum for lesson status
CREATE TYPE public.lesson_status AS ENUM ('draft', 'published');

-- Courses table
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Course lessons/content table
CREATE TABLE public.course_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type lesson_type NOT NULL,
    content_url TEXT,
    content_data JSONB,
    order_index INTEGER NOT NULL DEFAULT 0,
    status lesson_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add updated_at trigger for courses
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for course_lessons
CREATE TRIGGER update_course_lessons_updated_at BEFORE UPDATE ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Company users can view their courses"
  ON public.courses FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage their courses"
  ON public.courses FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

-- RLS Policies for course_lessons
CREATE POLICY "Company users can view course lessons"
  ON public.course_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_lessons.course_id
      AND public.user_belongs_to_company(auth.uid(), courses.company_id)
    )
  );

CREATE POLICY "Company admins can manage course lessons"
  ON public.course_lessons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_lessons.course_id
      AND public.has_role(auth.uid(), 'company_admin')
      AND courses.company_id = public.get_user_company_id(auth.uid())
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_courses_company_id ON public.courses(company_id);
CREATE INDEX idx_course_lessons_course_id ON public.course_lessons(course_id);
CREATE INDEX idx_course_lessons_order ON public.course_lessons(course_id, order_index);
