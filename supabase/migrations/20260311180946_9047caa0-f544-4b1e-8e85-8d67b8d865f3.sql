
ALTER TABLE public.disputes
ADD COLUMN IF NOT EXISTS refund_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS refund_stripe_id text DEFAULT NULL;

COMMENT ON COLUMN public.disputes.refund_type IS 'Type of refund: full, partial, or none';
COMMENT ON COLUMN public.disputes.refund_amount IS 'Refund amount in euros';
COMMENT ON COLUMN public.disputes.refund_stripe_id IS 'Stripe refund ID';
