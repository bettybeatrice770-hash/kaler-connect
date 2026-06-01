
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reset_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reset_requested_at timestamptz;

CREATE OR REPLACE FUNCTION public.request_password_reset_by_phone(_phone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
BEGIN
  -- Strip everything but digits for matching; profiles.phone is expected to be E.164-like
  normalized := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
  IF length(normalized) < 9 THEN
    RETURN true; -- silent
  END IF;

  UPDATE public.profiles
     SET reset_requested = true,
         reset_requested_at = now()
   WHERE regexp_replace(phone, '\D', '', 'g') LIKE '%' || normalized;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_password_reset_by_phone(text) FROM public;
GRANT EXECUTE ON FUNCTION public.request_password_reset_by_phone(text) TO anon, authenticated;
