-- Add timing columns to interventions table
ALTER TABLE public.interventions
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS response_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS travel_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS intervention_duration_seconds INTEGER;

-- Create partner_statistics table
CREATE TABLE public.partner_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL UNIQUE,
  average_rating NUMERIC(3,2),
  total_interventions INTEGER NOT NULL DEFAULT 0,
  completed_interventions INTEGER NOT NULL DEFAULT 0,
  average_response_time_seconds INTEGER,
  average_arrival_time_seconds INTEGER,
  average_intervention_time_seconds INTEGER,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_statistics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view partner statistics"
ON public.partner_statistics
FOR SELECT
USING (true);

CREATE POLICY "System can manage partner statistics"
ON public.partner_statistics
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_partner_statistics_updated_at
BEFORE UPDATE ON public.partner_statistics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_partner_statistics_partner_id ON public.partner_statistics(partner_id);
CREATE INDEX idx_interventions_technician_completed ON public.interventions(technician_id, status) WHERE status = 'completed';

-- Enable realtime for partner_statistics
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_statistics;