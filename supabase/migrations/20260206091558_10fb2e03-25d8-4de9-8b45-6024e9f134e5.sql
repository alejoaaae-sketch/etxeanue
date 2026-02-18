
-- Remove the sync trigger and function that bypasses RLS
DROP TRIGGER IF EXISTS sync_home_location_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_home_location_to_protector();
