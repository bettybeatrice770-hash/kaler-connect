-- ==========================================
-- 1. DROP OLD FUNCTION & CREATE INDEXES
-- ==========================================
DROP FUNCTION IF EXISTS public.get_dashboard_data();

CREATE INDEX IF NOT EXISTS idx_profiles_family 
  ON public.profiles(family_id);

CREATE INDEX IF NOT EXISTS idx_member_records_profile 
  ON public.member_records(profile_id);

CREATE INDEX IF NOT EXISTS idx_member_records_family 
  ON public.member_records(family_id) WHERE family_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_arrears_unpaid_records 
  ON public.arrears(member_record_id) WHERE cleared = false;

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
  _family_id uuid;
  _record_ids uuid[]; -- Variable to cache record IDs and prevent double scanning
BEGIN
  -- Strict Auth Guard
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Grab the family_id cleanly
  SELECT family_id INTO _family_id
  FROM public.profiles WHERE id = _uid;

  -- 2. Fetch and cache the target member record IDs once
  SELECT array_agg(id) INTO _record_ids
  FROM public.member_records
  WHERE profile_id = _uid
     OR (_family_id IS NOT NULL AND family_id = _family_id);

  -- 3. Build and return the final JSON payload safely using cached data
  RETURN jsonb_build_object(
    'profile', (
      SELECT to_jsonb(p) FROM public.profiles p WHERE p.id = _uid
    ),
    
    'branches', COALESCE(
      (SELECT jsonb_agg(to_jsonb(b)) FROM public.branches b),
      '[]'::jsonb
    ),
    
    'member_records', COALESCE(
      (SELECT jsonb_agg(to_jsonb(r)) 
       FROM public.member_records r 
       WHERE r.id = ANY(_record_ids)), -- Extremely fast array lookup
      '[]'::jsonb
    ),
    
    'arrears', COALESCE(
      (SELECT jsonb_agg(to_jsonb(a))
       FROM public.arrears a
       WHERE a.cleared = false
         AND a.member_record_id = ANY(_record_ids)), -- Reusing the same array lookup
      '[]'::jsonb
    )
  );
END;
$$;

-- ==========================================
-- 3. PERMISSIONS
-- ==========================================
GRANT EXECUTE ON FUNCTION public.get_dashboard_data() TO authenticated;
