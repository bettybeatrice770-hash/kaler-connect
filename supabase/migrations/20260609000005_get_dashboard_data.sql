-- ==========================================
-- 1. DROP OLD FUNCTION & CREATE OPTIMIZED INDEXES
-- ==========================================
DROP FUNCTION IF EXISTS public.get_dashboard_data();

-- Indexes for profiles & records lookup
CREATE INDEX IF NOT EXISTS idx_profiles_family 
  ON public.profiles(family_id);

CREATE INDEX IF NOT EXISTS idx_member_records_profile 
  ON public.member_records(profile_id);

CREATE INDEX IF NOT EXISTS idx_member_records_family 
  ON public.member_records(family_id) WHERE family_id IS NOT NULL;

-- Partial index for fast lookup of active/unpaid arrears
CREATE INDEX IF NOT EXISTS idx_arrears_unpaid_records 
  ON public.arrears(member_record_id) WHERE cleared = false;

-- Composite index for fast family request filtering
CREATE INDEX IF NOT EXISTS idx_family_requests_dashboard
  ON public.family_requests(family_id, category, status);

-- ==========================================
-- 2. THE FINAL OPTIMIZED FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_dashboard_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  -- Fail early if the session is unauthenticated
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN (
    WITH user_profile AS (
      SELECT id, family_id 
      FROM public.profiles 
      WHERE id = _uid
    ),
    matched_records AS (
      SELECT r.id 
      FROM public.member_records r
      LEFT JOIN user_profile up ON true
      WHERE r.profile_id = _uid
         OR (up.family_id IS NOT NULL AND r.family_id = up.family_id)
    )
    SELECT jsonb_build_object(
      'profile', (
        SELECT to_jsonb(p) 
        FROM public.profiles p 
        WHERE p.id = _uid
      ),
      'branches', COALESCE(
        (SELECT jsonb_agg(to_jsonb(b)) FROM public.branches b),
        '[]'::jsonb
      ),
      'member_records', COALESCE(
        (SELECT jsonb_agg(to_jsonb(r))
         FROM public.member_records r
         WHERE r.id IN (SELECT id FROM matched_records)),
        '[]'::jsonb
      ),
      'arrears', COALESCE(
        (SELECT jsonb_agg(to_jsonb(a))
         FROM public.arrears a
         WHERE a.cleared = false
           AND a.member_record_id IN (SELECT id FROM matched_records)),
        '[]'::jsonb
      ),
      'children', COALESCE(
        (SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', fr.id,
                    'full_name', fr.full_name,
                    'birth_month', fr.birth_month,
                    'birth_year', fr.birth_year
                  )
                )
         FROM public.family_requests fr
         JOIN user_profile up ON fr.family_id = up.family_id
         WHERE fr.category = 'child'
           AND fr.status = 'approved'),
        '[]'::jsonb
      )
    )
  );
END;
$$;

-- ==========================================
-- 3. PERMISSIONS & SECURITY POLICIES
-- ==========================================
-- Revoke all default privileges to adhere to strict SECURITY DEFINER guidelines
REVOKE ALL ON FUNCTION public.get_dashboard_data() FROM PUBLIC;

-- Explicitly allow access only to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_data() TO authenticated;
