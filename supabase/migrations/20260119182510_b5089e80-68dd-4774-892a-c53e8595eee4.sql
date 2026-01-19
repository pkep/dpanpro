-- Add tracking_code column to interventions
ALTER TABLE public.interventions
ADD COLUMN tracking_code TEXT UNIQUE;

-- Add client contact info for guest interventions
ALTER TABLE public.interventions
ADD COLUMN client_email TEXT,
ADD COLUMN client_phone TEXT;

-- Create function to generate tracking code
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'DP-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate tracking code and title on insert
CREATE OR REPLACE FUNCTION public.set_intervention_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate tracking code if not provided
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := public.generate_tracking_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_intervention_defaults_trigger
BEFORE INSERT ON public.interventions
FOR EACH ROW
EXECUTE FUNCTION public.set_intervention_defaults();