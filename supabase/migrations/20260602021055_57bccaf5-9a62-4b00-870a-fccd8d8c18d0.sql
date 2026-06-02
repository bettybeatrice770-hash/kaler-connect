
-- Generic trigger function for auditing row changes.
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec_id text;
  actor uuid := auth.uid();
BEGIN
  IF (TG_OP = 'DELETE') THEN
    rec_id := COALESCE((to_jsonb(OLD)->>'id'), NULL);
  ELSE
    rec_id := COALESCE((to_jsonb(NEW)->>'id'), NULL);
  END IF;

  INSERT INTO public.audit_log (actor_id, action, table_name, record_id, details)
  VALUES (
    actor,
    TG_TABLE_NAME || '.' || lower(TG_OP),
    TG_TABLE_NAME,
    rec_id,
    CASE
      WHEN TG_OP = 'DELETE' THEN jsonb_build_object('old', to_jsonb(OLD))
      WHEN TG_OP = 'INSERT' THEN jsonb_build_object('new', to_jsonb(NEW))
      ELSE jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    END
  );

  IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;

-- Attach to arrears, families, dependents, member_records.
DROP TRIGGER IF EXISTS audit_arrears_changes ON public.arrears;
CREATE TRIGGER audit_arrears_changes
AFTER INSERT OR UPDATE OR DELETE ON public.arrears
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_families_changes ON public.families;
CREATE TRIGGER audit_families_changes
AFTER INSERT OR UPDATE OR DELETE ON public.families
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_dependents_changes ON public.dependents;
CREATE TRIGGER audit_dependents_changes
AFTER INSERT OR UPDATE OR DELETE ON public.dependents
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP TRIGGER IF EXISTS audit_member_records_changes ON public.member_records;
CREATE TRIGGER audit_member_records_changes
AFTER UPDATE OR DELETE ON public.member_records
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
