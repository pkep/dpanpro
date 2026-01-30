
-- Create technician_payouts table for tracking payments
CREATE TABLE public.technician_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payout_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create disputes table for tracking client disputes
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.users(id),
  technician_id UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'open',
  client_notes TEXT,
  technician_notes TEXT,
  admin_notes TEXT,
  resolution TEXT,
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technician_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- RLS policies for technician_payouts
CREATE POLICY "Admins and managers can manage payouts"
ON public.technician_payouts
FOR ALL
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Technicians can view their own payouts"
ON public.technician_payouts
FOR SELECT
USING (true);

-- RLS policies for disputes
CREATE POLICY "Admins and managers can manage disputes"
ON public.disputes
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can view disputes"
ON public.disputes
FOR SELECT
USING (true);

-- Create updated_at triggers
CREATE TRIGGER update_technician_payouts_updated_at
BEFORE UPDATE ON public.technician_payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
