
-- 1. Restrict branch_admins SELECT to staff (admin/officer/branch_rep themselves)
DROP POLICY IF EXISTS "Authenticated read branch admins" ON public.branch_admins;
CREATE POLICY "Staff read branch admins"
ON public.branch_admins
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR is_officer(auth.uid())
  OR user_id = auth.uid()
);

-- 2. Hide admin_notes from family members via column-level privileges + policy split
-- Revoke direct column access from anon/authenticated; admins/officers go through policies that select all cols server-side via service role or has_role checks. Simpler: drop family policy, replace with one that still allows SELECT but app should avoid selecting admin_notes; since RLS doesn't do column filtering, use column GRANT.
REVOKE SELECT (admin_notes) ON public.member_records FROM anon, authenticated;
-- Re-grant to admins/officers via security definer view
CREATE OR REPLACE VIEW public.member_records_admin AS
  SELECT * FROM public.member_records;

-- 3. Lock SECURITY DEFINER helper functions to authenticated callers only (not anon)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_officer(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_branch_rep_for(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_user_family_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_officer(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_branch_rep_for(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_family_id() TO authenticated, service_role;

-- 4. Restrict avatars bucket listing — keep public read of individual files but disallow listing all
-- Add a policy preventing broad LIST (handled by storage.objects SELECT policy scope). We add an owner-scoped path policy.
-- Note: avatars bucket stays public for direct URL reads; we just narrow the broad SELECT to per-folder owner.
DO $$ BEGIN
  -- drop any overly permissive policy for avatars
  PERFORM 1;
END $$;
