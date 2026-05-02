-- Drop old arrears table (was profile-bound, never populated)
DROP TABLE IF EXISTS public.arrears;

-- Master roster (secretary-managed, no auth dependency)
CREATE TABLE public.member_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  category public.member_category NOT NULL DEFAULT 'full_member',
  status public.member_status NOT NULL DEFAULT 'active',
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  development_paid numeric DEFAULT 0,
  fpf_paid numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_records_branch ON public.member_records(branch_id);
CREATE INDEX idx_member_records_family ON public.member_records(family_id);
CREATE INDEX idx_member_records_profile ON public.member_records(profile_id);
CREATE INDEX idx_member_records_phone ON public.member_records(phone);

ALTER TABLE public.member_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own record"
  ON public.member_records FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "View family records"
  ON public.member_records FOR SELECT
  USING (family_id IS NOT NULL AND family_id = public.current_user_family_id());

CREATE POLICY "Admins view all records"
  ON public.member_records FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage records"
  ON public.member_records FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER member_records_touch_updated_at
  BEFORE UPDATE ON public.member_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Arrears tied to member_records (not profiles)
CREATE TABLE public.arrears (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_record_id uuid NOT NULL REFERENCES public.member_records(id) ON DELETE CASCADE,
  type public.contribution_type NOT NULL,
  year integer,
  funeral_name text,
  amount numeric NOT NULL CHECK (amount >= 0),
  cleared boolean NOT NULL DEFAULT false,
  cleared_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_arrears_member ON public.arrears(member_record_id);
CREATE INDEX idx_arrears_open ON public.arrears(member_record_id) WHERE cleared = false;

ALTER TABLE public.arrears ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View arrears via member record"
  ON public.arrears FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.member_records mr
      WHERE mr.id = arrears.member_record_id
        AND (
          mr.profile_id = auth.uid()
          OR (mr.family_id IS NOT NULL AND mr.family_id = public.current_user_family_id())
        )
    )
  );

CREATE POLICY "Admins view all arrears"
  ON public.arrears FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage arrears"
  ON public.arrears FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER arrears_touch_updated_at
  BEFORE UPDATE ON public.arrears
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();