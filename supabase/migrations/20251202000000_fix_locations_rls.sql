-- Fix locations RLS policies to match other tables and support all user roles

-- Drop existing policies
DROP POLICY IF EXISTS "locations_select_policy" ON public.locations;

DROP POLICY IF EXISTS "locations_insert_policy" ON public.locations;

DROP POLICY IF EXISTS "locations_update_policy" ON public.locations;

DROP POLICY IF EXISTS "locations_delete_policy" ON public.locations;

-- Create new policies that match the pattern used in other tables (like departments)

-- SELECT policy - all authenticated users can view locations from their company
CREATE POLICY "locations_select_policy" ON public.locations FOR
SELECT TO authenticated USING (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

-- INSERT policy - authenticated users can insert locations for their company
CREATE POLICY "locations_insert_policy" ON public.locations FOR INSERT TO authenticated
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

-- UPDATE policy - authenticated users can update locations from their company
CREATE POLICY "locations_update_policy" ON public.locations FOR
UPDATE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
)
WITH
    CHECK (
        company_id IN (
            SELECT company_id
            FROM public.user_roles
            WHERE
                user_id = auth.uid ()
        )
    );

-- DELETE policy - authenticated users can delete locations from their company
CREATE POLICY "locations_delete_policy" ON public.locations FOR DELETE TO authenticated USING (
    company_id IN (
        SELECT company_id
        FROM public.user_roles
        WHERE
            user_id = auth.uid ()
    )
);