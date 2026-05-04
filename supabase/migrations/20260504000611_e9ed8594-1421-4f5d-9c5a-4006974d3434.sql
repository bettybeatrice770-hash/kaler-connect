ALTER TABLE public.member_records
  ADD COLUMN IF NOT EXISTS advance_subscription_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_notes text;

CREATE OR REPLACE FUNCTION public.arrears_auto_clear()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.amount IS NULL OR NEW.amount = 0 THEN
    NEW.cleared := true;
    IF NEW.cleared_at IS NULL THEN NEW.cleared_at := now(); END IF;
  ELSIF (TG_OP = 'UPDATE' AND OLD.amount = 0 AND NEW.amount > 0) THEN
    NEW.cleared := false;
    NEW.cleared_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS arrears_auto_clear_trg ON public.arrears;
CREATE TRIGGER arrears_auto_clear_trg
BEFORE INSERT OR UPDATE ON public.arrears
FOR EACH ROW EXECUTE FUNCTION public.arrears_auto_clear();

CREATE OR REPLACE FUNCTION public.is_officer(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role IN ('admin','officer'))
$$;

CREATE OR REPLACE FUNCTION public.is_branch_rep_for(_uid uuid, _branch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.branch_admins WHERE user_id = _uid AND branch_id = _branch)
$$;

DROP POLICY IF EXISTS "Officers read records" ON public.member_records;
CREATE POLICY "Officers read records" ON public.member_records FOR SELECT USING (public.is_officer(auth.uid()));

DROP POLICY IF EXISTS "Officers read arrears" ON public.arrears;
CREATE POLICY "Officers read arrears" ON public.arrears FOR SELECT USING (public.is_officer(auth.uid()));

DROP POLICY IF EXISTS "Officers read profiles" ON public.profiles;
CREATE POLICY "Officers read profiles" ON public.profiles FOR SELECT USING (public.is_officer(auth.uid()));

DROP POLICY IF EXISTS "Officers read contributions" ON public.contributions;
CREATE POLICY "Officers read contributions" ON public.contributions FOR SELECT USING (public.is_officer(auth.uid()));

DROP POLICY IF EXISTS "Branch reps read records" ON public.member_records;
CREATE POLICY "Branch reps read records" ON public.member_records FOR SELECT USING (branch_id IS NOT NULL AND public.is_branch_rep_for(auth.uid(), branch_id));

DROP POLICY IF EXISTS "Branch reps read profiles" ON public.profiles;
CREATE POLICY "Branch reps read profiles" ON public.profiles FOR SELECT USING (branch_id IS NOT NULL AND public.is_branch_rep_for(auth.uid(), branch_id));

DROP POLICY IF EXISTS "Branch reps read arrears" ON public.arrears;
CREATE POLICY "Branch reps read arrears" ON public.arrears FOR SELECT USING (EXISTS (SELECT 1 FROM public.member_records mr WHERE mr.id = arrears.member_record_id AND mr.branch_id IS NOT NULL AND public.is_branch_rep_for(auth.uid(), mr.branch_id)));