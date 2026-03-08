
-- Fix the self-referential bug in the INSERT policy for intervention_ratings
DROP POLICY IF EXISTS "Clients can insert their own ratings" ON public.intervention_ratings;

CREATE POLICY "Clients can insert their own ratings"
ON public.intervention_ratings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM interventions
    WHERE interventions.id = intervention_ratings.intervention_id
      AND interventions.client_id = intervention_ratings.client_id
      AND interventions.status = 'completed'
  )
);
