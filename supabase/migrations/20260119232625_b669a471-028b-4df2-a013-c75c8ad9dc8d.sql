-- Add base_price and default_priority columns to services table
ALTER TABLE public.services 
ADD COLUMN base_price numeric NOT NULL DEFAULT 0,
ADD COLUMN default_priority text NOT NULL DEFAULT 'normal';

-- Create priority_multipliers table for configurable urgency coefficients
CREATE TABLE public.priority_multipliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority text NOT NULL UNIQUE,
  multiplier numeric NOT NULL DEFAULT 1.0,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.priority_multipliers ENABLE ROW LEVEL SECURITY;

-- RLS policies for priority_multipliers
CREATE POLICY "Priority multipliers are viewable by everyone" 
ON public.priority_multipliers 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage priority multipliers" 
ON public.priority_multipliers 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_priority_multipliers_updated_at
BEFORE UPDATE ON public.priority_multipliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();