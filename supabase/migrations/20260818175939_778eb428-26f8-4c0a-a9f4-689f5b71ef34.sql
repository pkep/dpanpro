-- Data API grants for intervention_work_photos (custom auth: auth.uid() is always null)
GRANT SELECT ON public.intervention_work_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intervention_work_photos TO authenticated;
GRANT ALL ON public.intervention_work_photos TO service_role;

-- Permissive read policy so the app (custom auth) can read work photos
DROP POLICY IF EXISTS "Work photos are readable" ON public.intervention_work_photos;
CREATE POLICY "Work photos are readable"
ON public.intervention_work_photos
FOR SELECT
USING (true);