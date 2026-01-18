-- Create table for intervention ratings/reviews
CREATE TABLE public.intervention_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(intervention_id) -- Only one rating per intervention
);

-- Enable RLS
ALTER TABLE public.intervention_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can insert ratings for their own completed interventions
CREATE POLICY "Clients can insert their own ratings"
ON public.intervention_ratings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interventions
    WHERE interventions.id = intervention_id
    AND interventions.client_id = client_id
    AND interventions.status = 'completed'
  )
);

-- Policy: Anyone can read ratings
CREATE POLICY "Anyone can read ratings"
ON public.intervention_ratings
FOR SELECT
USING (true);

-- Policy: Clients can update their own ratings
CREATE POLICY "Clients can update their own ratings"
ON public.intervention_ratings
FOR UPDATE
USING (true)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interventions
    WHERE interventions.id = intervention_id
    AND interventions.client_id = client_id
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_intervention_ratings_updated_at
BEFORE UPDATE ON public.intervention_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();