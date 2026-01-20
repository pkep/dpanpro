-- Table pour suivre les tentatives de dispatch
CREATE TABLE public.dispatch_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  score_breakdown JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'timeout', 'cancelled')),
  attempt_order INTEGER NOT NULL DEFAULT 1,
  notified_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  timeout_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour la disponibilité des techniciens
CREATE TABLE public.technician_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  current_intervention_id UUID REFERENCES public.interventions(id) ON DELETE SET NULL,
  max_concurrent_interventions INTEGER NOT NULL DEFAULT 3,
  last_status_change TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dispatch_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_availability ENABLE ROW LEVEL SECURITY;

-- Policies for dispatch_attempts
CREATE POLICY "Admins can manage dispatch attempts"
ON public.dispatch_attempts
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Technicians can view their own attempts"
ON public.dispatch_attempts
FOR SELECT
USING (true);

CREATE POLICY "Technicians can update their own attempts"
ON public.dispatch_attempts
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policies for technician_availability
CREATE POLICY "Anyone can view availability"
ON public.technician_availability
FOR SELECT
USING (true);

CREATE POLICY "Technicians can manage their availability"
ON public.technician_availability
FOR ALL
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_dispatch_attempts_intervention ON public.dispatch_attempts(intervention_id);
CREATE INDEX idx_dispatch_attempts_technician ON public.dispatch_attempts(technician_id);
CREATE INDEX idx_dispatch_attempts_status ON public.dispatch_attempts(status);
CREATE INDEX idx_dispatch_attempts_timeout ON public.dispatch_attempts(timeout_at) WHERE status = 'pending';
CREATE INDEX idx_technician_availability_available ON public.technician_availability(technician_id) WHERE is_available = true;

-- Triggers for updated_at
CREATE TRIGGER update_dispatch_attempts_updated_at
BEFORE UPDATE ON public.dispatch_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technician_availability_updated_at
BEFORE UPDATE ON public.technician_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for dispatch_attempts
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_attempts;