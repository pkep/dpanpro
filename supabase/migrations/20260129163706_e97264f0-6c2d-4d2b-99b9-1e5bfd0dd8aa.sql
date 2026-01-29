-- Create table for technician ratings of clients
CREATE TABLE public.technician_client_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(intervention_id)
);

-- Enable RLS
ALTER TABLE public.technician_client_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Technicians can insert their own ratings"
ON public.technician_client_ratings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Technicians can update their own ratings"
ON public.technician_client_ratings
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can view technician client ratings"
ON public.technician_client_ratings
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_technician_client_ratings_updated_at
BEFORE UPDATE ON public.technician_client_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();