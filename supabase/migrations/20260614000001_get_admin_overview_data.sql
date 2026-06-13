-- Consolidates the 5 separate AdminOverview queries into one RPC
-- to eliminate multiple round-trips on admin dashboard load.

CREATE OR REPLACE FUNCTION public.get_admin_overview_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'officer') OR public.has_role(_uid, 'branch_rep')) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN jsonb_build_object(
    'branches', COALESCE(
      (SELECT jsonb_agg(to_jsonb(b) ORDER BY b.name)
       FROM public.branches b),
      '[]'::jsonb
    ),
    'member_records', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'full_name', r.full_name,
          'category', r.category,
          'status', r.status,
          'branch_id', r.branch_id,
          'profile_id', r.profile_id,
          'development_paid', r.development_paid,
          'fpf_paid', r.fpf_paid,
          'advance_subscription_paid', r.advance_subscription_paid
        )
      ) FROM public.member_records r),
      '[]'::jsonb
    ),
    'arrears', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'amount', a.amount,
          'cleared', a.cleared,
          'member_record_id', a.member_record_id
        )
      ) FROM public.arrears a WHERE a.cleared = false),
      '[]'::jsonb
    ),
    'reset_requests', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'phone', p.phone,
          'reset_requested_at', p.reset_requested_at
        ) ORDER BY p.reset_requested_at DESC
      ) FROM public.profiles p WHERE p.reset_requested = true),
      '[]'::jsonb
    ),
    'family_requests', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', fr.id,
          'full_name', fr.full_name,
          'category', fr.category,
          'phone', fr.phone,
          'birth_month', fr.birth_month,
          'birth_year', fr.birth_year,
          'family_id', fr.family_id,
          'submitted_by_profile_id', fr.submitted_by_profile_id,
          'created_at', fr.created_at,
          'profiles', (SELECT jsonb_build_object('full_name', p2.full_name)
                       FROM public.profiles p2
                       WHERE p2.id = fr.submitted_by_profile_id),
          'families', (SELECT jsonb_build_object('family_name', f.family_name)
                       FROM public.families f
                       WHERE f.id = fr.family_id)
        ) ORDER BY fr.created_at ASC
      ) FROM public.family_requests fr WHERE fr.status = 'pending'),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_overview_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_overview_data() TO authenticated;
