-- Make intervention_id nullable so we can create payment authorizations before interventions
ALTER TABLE public.payment_authorizations ALTER COLUMN intervention_id DROP NOT NULL;