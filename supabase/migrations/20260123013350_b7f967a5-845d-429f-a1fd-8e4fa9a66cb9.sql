-- Remove en_route from the constraint, keeping only on_route
ALTER TABLE public.interventions DROP CONSTRAINT IF EXISTS interventions_status_check;
ALTER TABLE public.interventions ADD CONSTRAINT interventions_status_check 
  CHECK (status IN ('new', 'assigned', 'on_route', 'in_progress', 'completed', 'cancelled'));