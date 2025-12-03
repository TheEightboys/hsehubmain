-- Migration: Create Documents Management System
-- Includes table, storage bucket, and RLS policies

-- ============================================
-- DOCUMENT CATEGORIES ENUM
-- ============================================
DO $$ BEGIN
    CREATE TYPE public.document_category AS ENUM (
        'policy',
        'procedure',
        'risk_assessment',
        'training',
        'incident_report',
        'audit_report',
        'certificate',
        'permit',
        'inspection',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

-- Document Info
title VARCHAR(255) NOT NULL,
description TEXT,
category public.document_category NOT NULL DEFAULT 'other',

-- File Info
file_name VARCHAR(255) NOT NULL,
file_path VARCHAR(500) NOT NULL, -- Path in storage bucket
file_size BIGINT, -- Size in bytes
mime_type VARCHAR(100),

-- Organization
tags TEXT [],
department_id UUID REFERENCES public.departments (id) ON DELETE SET NULL,

-- Access Control
is_public BOOLEAN DEFAULT false, -- Public to all company users
allowed_roles TEXT [], -- Specific roles that can access

-- Metadata
version VARCHAR(20) DEFAULT '1.0',
expiry_date DATE, -- For certificates, permits, etc.

-- Audit Trail
uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

-- Links to related records
related_risk_assessment_id UUID REFERENCES public.risk_assessments(id) ON DELETE SET NULL,
    related_audit_id UUID REFERENCES public.audits(id) ON DELETE SET NULL,
    related_incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_company ON public.documents (company_id);

CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents (category);

CREATE INDEX IF NOT EXISTS idx_documents_department ON public.documents (department_id);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_documents_expiry ON public.documents (expiry_date);

CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN (tags);

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================
-- Create storage bucket for documents
INSERT INTO
    storage.buckets (
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
    )
VALUES (
        'documents',
        'documents',
        false,
        52428800, -- 50MB limit
        ARRAY [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain',
        'text/csv'
    ]
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Allow users to upload documents to their company folder
CREATE POLICY "Users can upload documents to their company folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.companies
        WHERE id IN (
            SELECT company_id FROM public.user_roles
            WHERE user_id = auth.uid()
        )
    )
);

-- Allow users to read documents from their company folder
CREATE POLICY "Users can read documents from their company folder"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.companies
        WHERE id IN (
            SELECT company_id FROM public.user_roles
            WHERE user_id = auth.uid()
        )
    )
);

-- Allow users to update documents in their company folder (admin only)
CREATE POLICY "Admins can update documents in their company folder"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.companies
        WHERE id IN (
            SELECT company_id FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role::text IN ('company_admin', 'super_admin')
        )
    )
);

-- Allow admins to delete documents from their company folder
CREATE POLICY "Admins can delete documents from their company folder"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.companies
        WHERE id IN (
            SELECT company_id FROM public.user_roles
            WHERE user_id = auth.uid()
            AND role::text IN ('company_admin', 'super_admin')
        )
    )
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) FOR DOCUMENTS TABLE
-- ============================================

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Users can view documents from their company
CREATE POLICY "documents_select" ON public.documents FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
        AND (
            is_public = true
            OR uploaded_by = auth.uid ()
            OR allowed_roles IS NULL
            OR EXISTS (
                SELECT 1
                FROM public.user_roles
                WHERE
                    user_id = auth.uid ()
                    AND company_id = documents.company_id
                    AND (
                        role::text = ANY(documents.allowed_roles)
                        OR role::text IN (
                            'company_admin', 'super_admin'
                        )
                    )
            )
        )
    );

-- Users can insert documents in their company
CREATE POLICY "documents_insert" ON public.documents FOR INSERT
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

-- Admins can update documents in their company
CREATE POLICY "documents_update" ON public.documents FOR
UPDATE USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
            AND role::text IN (
                'company_admin',
                'super_admin'
            )
    )
    OR uploaded_by = auth.uid ()
);

-- Admins can delete documents in their company
CREATE POLICY "documents_delete" ON public.documents FOR DELETE USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
            AND role::text IN (
                'company_admin',
                'super_admin'
            )
    )
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Function to get document statistics for a company
CREATE OR REPLACE FUNCTION get_document_stats(p_company_id UUID)
RETURNS TABLE (
    total_documents BIGINT,
    total_size_mb NUMERIC,
    by_category JSONB,
    expiring_soon BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_documents,
        ROUND(SUM(COALESCE(file_size, 0))::NUMERIC / 1048576, 2) as total_size_mb,
        jsonb_object_agg(category, count) as by_category,
        COUNT(*) FILTER (
            WHERE expiry_date IS NOT NULL 
            AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
            AND expiry_date >= CURRENT_DATE
        )::BIGINT as expiring_soon
    FROM (
        SELECT 
            category,
            COUNT(*) as count,
            file_size,
            expiry_date
        FROM public.documents
        WHERE company_id = p_company_id
        GROUP BY category, file_size, expiry_date
    ) subquery;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.documents IS 'Document management system for HSE documents, policies, procedures, and records';

COMMENT ON COLUMN public.documents.file_path IS 'Storage path in format: {company_id}/{category}/{filename}';

COMMENT ON COLUMN public.documents.is_public IS 'If true, all company users can access. If false, only allowed_roles can access';

COMMENT ON COLUMN public.documents.allowed_roles IS 'Array of role names that can access this document (if not public)';

COMMENT ON COLUMN public.documents.expiry_date IS 'Expiry date for documents like certificates, permits, licenses';