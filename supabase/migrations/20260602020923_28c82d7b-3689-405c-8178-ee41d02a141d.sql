
-- 1) audit_log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid,
  actor_label text,
  action text NOT NULL,
  table_name text,
  record_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON public.audit_log (action);

-- Grants: admins read via RLS; only service_role writes
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) cancel password reset request (admin-only)
CREATE OR REPLACE FUNCTION public.cancel_password_reset_request(_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admins only';
  END IF;
  UPDATE public.profiles
     SET reset_requested = false,
         reset_requested_at = NULL
   WHERE id = _profile_id;

  INSERT INTO public.audit_log (actor_id, action, table_name, record_id, details)
  VALUES (auth.uid(), 'password_reset.cancel', 'profiles', _profile_id::text, NULL);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_password_reset_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_password_reset_request(uuid) TO authenticated, service_role;
