-- Table pour stocker les lignes de devis par intervention
CREATE TABLE public.intervention_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL, -- 'displacement', 'security', 'repair'
  label TEXT NOT NULL,
  base_price NUMERIC NOT NULL DEFAULT 0,
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  calculated_price NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour stocker les autorisations de paiement (provider-agnostic)
CREATE TABLE public.payment_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  payment_provider TEXT NOT NULL DEFAULT 'stripe', -- 'stripe', 'paypal', etc.
  provider_payment_id TEXT, -- Stripe: payment_intent_id
  provider_customer_id TEXT, -- Stripe: customer_id
  amount_authorized NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'authorized', 'captured', 'cancelled', 'failed'
  client_email TEXT,
  client_phone TEXT,
  authorization_requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  authorization_confirmed_at TIMESTAMP WITH TIME ZONE,
  captured_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intervention_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_authorizations ENABLE ROW LEVEL SECURITY;

-- Policies for intervention_quotes
CREATE POLICY "Anyone can view intervention quotes"
ON public.intervention_quotes
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert intervention quotes"
ON public.intervention_quotes
FOR INSERT
WITH CHECK (true);

-- Policies for payment_authorizations
CREATE POLICY "Anyone can view payment authorizations"
ON public.payment_authorizations
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert payment authorizations"
ON public.payment_authorizations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update payment authorizations"
ON public.payment_authorizations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Trigger for updated_at on payment_authorizations
CREATE TRIGGER update_payment_authorizations_updated_at
BEFORE UPDATE ON public.payment_authorizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_intervention_quotes_intervention_id ON public.intervention_quotes(intervention_id);
CREATE INDEX idx_payment_authorizations_intervention_id ON public.payment_authorizations(intervention_id);
CREATE INDEX idx_payment_authorizations_provider_payment_id ON public.payment_authorizations(provider_payment_id);