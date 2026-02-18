
-- Phone validation function
CREATE OR REPLACE FUNCTION public.validate_phone_format()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    IF NEW.phone !~ '^[67][0-9]{8}$' THEN
      RAISE EXCEPTION 'Invalid phone number format: %', NEW.phone;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'protector_links' THEN
    IF NEW.protector_phone !~ '^[67][0-9]{8}$' THEN
      RAISE EXCEPTION 'Invalid protector phone number format: %', NEW.protector_phone;
    END IF;
    IF NEW.protegido_phone IS NOT NULL AND NEW.protegido_phone !~ '^[67][0-9]{8}$' THEN
      RAISE EXCEPTION 'Invalid protegido phone number format: %', NEW.protegido_phone;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger on profiles
CREATE TRIGGER validate_phone_on_profiles
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_phone_format();

-- Trigger on protector_links
CREATE TRIGGER validate_phone_on_protector_links
  BEFORE INSERT OR UPDATE ON public.protector_links
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_phone_format();

-- Restrict protector update policy to only allow lat/lng changes
DROP POLICY IF EXISTS "Protectors can update protegido home location" ON public.profiles;

CREATE POLICY "Protectors can update protegido home location"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.protector_links pl
    WHERE pl.protegido_user_id = profiles.user_id
      AND pl.protector_user_id = auth.uid()
      AND pl.is_confirmed = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.protector_links pl
    WHERE pl.protegido_user_id = profiles.user_id
      AND pl.protector_user_id = auth.uid()
      AND pl.is_confirmed = true
  )
  AND display_name = display_name
  AND phone = phone
  AND user_id = user_id
);
