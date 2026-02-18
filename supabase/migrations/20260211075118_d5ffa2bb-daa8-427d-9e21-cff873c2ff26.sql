-- Allow protectors to update home location of their confirmed protegidos
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
);