
-- 1. Permitir invitaciones desde el protector (protegido_user_id puede ser null hasta que se registre)
ALTER TABLE public.protector_links ALTER COLUMN protegido_user_id DROP NOT NULL;

-- 2. Guardar datos del protegido para invitaciones pendientes
ALTER TABLE public.protector_links ADD COLUMN protegido_phone text;
ALTER TABLE public.protector_links ADD COLUMN protegido_display_name text;

-- 3. Permitir a protectores crear invitaciones
CREATE POLICY "Protectors can create invite links"
ON public.protector_links
FOR INSERT
WITH CHECK (auth.uid() = protector_user_id);

-- 4. Auto-vincular protegido cuando se registre con el teléfono que el protector indicó
CREATE OR REPLACE FUNCTION public.auto_link_protegido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.protector_links
  SET protegido_user_id = NEW.user_id,
      is_confirmed = true,
      updated_at = now()
  WHERE protegido_phone = NEW.phone
    AND protegido_user_id IS NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_link_protegido
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_protegido();

-- 5. Permitir que el protegido vea el perfil de su protector vinculado
CREATE POLICY "Protegidos can view their protectors profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM protector_links pl
    WHERE pl.protector_user_id = profiles.user_id
      AND pl.protegido_user_id = auth.uid()
      AND pl.is_confirmed = true
  )
);
