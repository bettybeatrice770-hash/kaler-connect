
DROP POLICY IF EXISTS "Officers read families" ON public.families;
CREATE POLICY "Officers read families"
ON public.families
FOR SELECT
USING (public.is_officer(auth.uid()));

DROP POLICY IF EXISTS "Branch reps read families" ON public.families;
CREATE POLICY "Branch reps read families"
ON public.families
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'branch_rep'
  )
);
