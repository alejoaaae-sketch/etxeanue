-- Trigger para copiar la ubicación de casa del protegido al protector vinculado
CREATE OR REPLACE FUNCTION public.sync_home_location_to_protector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Cuando un protegido actualiza su ubicación de casa
  IF NEW.home_latitude IS NOT NULL AND NEW.home_longitude IS NOT NULL THEN
    -- Buscar protector vinculado y actualizar su ubicación
    UPDATE public.profiles p
    SET home_latitude = NEW.home_latitude,
        home_longitude = NEW.home_longitude,
        updated_at = now()
    FROM public.protector_links pl
    WHERE pl.protegido_user_id = NEW.user_id
      AND pl.protector_user_id IS NOT NULL
      AND pl.is_confirmed = true
      AND p.user_id = pl.protector_user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger que se dispara al actualizar ubicación en profiles
CREATE TRIGGER sync_home_location_trigger
  AFTER UPDATE OF home_latitude, home_longitude ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_home_location_to_protector();