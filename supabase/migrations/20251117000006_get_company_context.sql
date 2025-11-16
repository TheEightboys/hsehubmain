-- ============================================
-- Ensure company context RPC (returns company_id + role)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_company_context()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_company_id UUID;
  v_role app_role;
  v_fix jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT company_id, role INTO v_company_id, v_role
  FROM public.user_roles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_company_id IS NULL THEN
    v_fix := public.fix_my_company_link();
    SELECT company_id, role INTO v_company_id, v_role
    FROM public.user_roles
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_fix->>'error', 'not_linked')
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'company_id', v_company_id,
    'role', COALESCE(v_role::text, 'company_admin')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_context() TO authenticated;
