-- Commits the get_user_auth_data RPC to migration history.
-- This function already exists in the database but was never committed.
-- It is called by useAuth.tsx on every login to load roles,
-- branch admin IDs, and the must_change_password flag.

CREATE OR REPLACE FUNCTION public.get_user_auth_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  _uid uuid := auth.uid();
  _result jsonb;
BEGIN
  -- 1. Fail fast: Stop execution immediately if no valid session exists
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '02000'; -- SQLSTATE for no data / unauthorized access
  END IF;

  -- 2. Build the auth payload in a single, efficient query
  SELECT jsonb_build_object(
    'roles', (
      SELECT COALESCE(jsonb_agg(ur.role), '[]'::jsonb)
      FROM public.user_roles ur
      WHERE ur.user_id = _uid
    ),
    'branch_admin_ids', (
      SELECT COALESCE(jsonb_agg(ba.branch_id), '[]'::jsonb)
      FROM public.branch_admins ba
      WHERE ba.user_id = _uid
    ),
    'must_change_password', COALESCE(
      (SELECT p.must_change_password FROM public.profiles p WHERE p.id = _uid),
      false
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

-- Revoke default public access and grant explicitly to authenticated users
REVOKE ALL ON FUNCTION public.get_user_auth_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_auth_data() TO authenticated;
