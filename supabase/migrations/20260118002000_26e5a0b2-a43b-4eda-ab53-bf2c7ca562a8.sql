-- Mettre à jour la contrainte de catégorie pour inclure glazing et aircon
ALTER TABLE public.interventions DROP CONSTRAINT interventions_category_check;
ALTER TABLE public.interventions ADD CONSTRAINT interventions_category_check 
  CHECK (category IN ('plumbing', 'electricity', 'heating', 'locksmith', 'glazing', 'aircon', 'other'));

-- Mettre à jour la contrainte de status pour inclure en_route
ALTER TABLE public.interventions DROP CONSTRAINT interventions_status_check;
ALTER TABLE public.interventions ADD CONSTRAINT interventions_status_check 
  CHECK (status IN ('new', 'assigned', 'en_route', 'in_progress', 'completed', 'cancelled'));