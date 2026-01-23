-- Step 1: Drop the old constraint
ALTER TABLE public.interventions DROP CONSTRAINT IF EXISTS interventions_status_check;

-- Step 2: Add new constraint that accepts both en_route and on_route temporarily
ALTER TABLE public.interventions ADD CONSTRAINT interventions_status_check 
  CHECK (status IN ('new', 'assigned', 'en_route', 'on_route', 'in_progress', 'completed', 'cancelled'));