-- Add 'en_route' status and 'to_reassign' status to interventions
-- These are already supported as text, no schema change needed

-- Create table to track declined interventions with reasons
CREATE TABLE public.declined_interventions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL,
  technician_id UUID NOT NULL,
  reason TEXT NOT NULL,
  declined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to track cancelled assignments with reasons
CREATE TABLE public.cancelled_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL,
  technician_id UUID NOT NULL,
  reason TEXT NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.declined_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancelled_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for declined_interventions
CREATE POLICY "Technicians can view their own declines"
  ON public.declined_interventions
  FOR SELECT
  USING (true);

CREATE POLICY "Technicians can insert their own declines"
  ON public.declined_interventions
  FOR INSERT
  WITH CHECK (true);

-- RLS policies for cancelled_assignments
CREATE POLICY "Anyone can view cancelled assignments"
  ON public.cancelled_assignments
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert cancelled assignments"
  ON public.cancelled_assignments
  FOR INSERT
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_declined_interventions_technician ON public.declined_interventions(technician_id);
CREATE INDEX idx_declined_interventions_intervention ON public.declined_interventions(intervention_id);
CREATE INDEX idx_cancelled_assignments_intervention ON public.cancelled_assignments(intervention_id);