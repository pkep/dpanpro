-- Drop the existing restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Technicians can insert work photos" ON public.intervention_work_photos;

-- Create a permissive INSERT policy
CREATE POLICY "Technicians can insert work photos" 
ON public.intervention_work_photos 
FOR INSERT 
TO public
WITH CHECK (true);