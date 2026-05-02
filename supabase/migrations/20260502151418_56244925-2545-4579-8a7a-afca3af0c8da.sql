-- =========================================================
-- 1. BRANCHES
-- =========================================================
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view branches"
  ON public.branches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage branches"
  ON public.branches FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER branches_touch_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed the 4 branches
INSERT INTO public.branches (name) VALUES
  ('Athi River'),
  ('Kayole'),
  ('Runda'),
  ('Kariobangi');

-- =========================================================
-- 2. PROFILE EXTENSIONS
-- =========================================================
CREATE TYPE public.member_category AS ENUM ('full_member', 'student', 'woman');
CREATE TYPE public.member_status AS ENUM ('active', 'dormant');

ALTER TABLE public.profiles
  ADD COLUMN branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN category public.member_category NOT NULL DEFAULT 'full_member',
  ADD COLUMN status public.member_status NOT NULL DEFAULT 'active';

CREATE INDEX idx_profiles_branch_id ON public.profiles(branch_id);

-- =========================================================
-- 3. CONTRIBUTION TYPE ADDITIONS
-- =========================================================
-- Add new values to the existing contribution_type enum (idempotent guards)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'subscription' AND enumtypid = 'public.contribution_type'::regtype) THEN
    ALTER TYPE public.contribution_type ADD VALUE 'subscription';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'development_fund' AND enumtypid = 'public.contribution_type'::regtype) THEN
    ALTER TYPE public.contribution_type ADD VALUE 'development_fund';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'fpf' AND enumtypid = 'public.contribution_type'::regtype) THEN
    ALTER TYPE public.contribution_type ADD VALUE 'fpf';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'funeral' AND enumtypid = 'public.contribution_type'::regtype) THEN
    ALTER TYPE public.contribution_type ADD VALUE 'funeral';
  END IF;
END $$;

ALTER TABLE public.contributions
  ADD COLUMN funeral_name text;

-- =========================================================
-- 4. ARREARS TABLE  (granular: one row per owed item)
-- =========================================================
CREATE TABLE public.arrears (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
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

CREATE INDEX idx_arrears_profile ON public.arrears(profile_id);
CREATE INDEX idx_arrears_family ON public.arrears(family_id);
CREATE INDEX idx_arrears_open ON public.arrears(profile_id) WHERE cleared = false;

ALTER TABLE public.arrears ENABLE ROW LEVEL SECURITY;

-- Member sees their own arrears
CREATE POLICY "View own arrears"
  ON public.arrears FOR SELECT
  USING (profile_id = auth.uid());

-- Family members see each other's arrears
CREATE POLICY "View family arrears"
  ON public.arrears FOR SELECT
  USING (family_id IS NOT NULL AND family_id = public.current_user_family_id());

-- Admins
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

-- Auto-sync family_id from profile
CREATE OR REPLACE FUNCTION public.arrears_set_family_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.family_id IS NULL AND NEW.profile_id IS NOT NULL THEN
    SELECT family_id INTO NEW.family_id FROM public.profiles WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER arrears_set_family_id_trg
  BEFORE INSERT OR UPDATE OF profile_id ON public.arrears
  FOR EACH ROW EXECUTE FUNCTION public.arrears_set_family_id();

-- =========================================================
-- 5. BRANCH ADMINS  (future branch-rep scoped access)
-- =========================================================
CREATE TABLE public.branch_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, branch_id)
);

ALTER TABLE public.branch_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read branch admins"
  ON public.branch_admins FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage branch admins"
  ON public.branch_admins FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));