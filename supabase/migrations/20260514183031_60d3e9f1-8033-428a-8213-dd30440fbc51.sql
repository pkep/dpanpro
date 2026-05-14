ALTER TABLE public.interventions
ADD COLUMN invoice_signature_data TEXT,
ADD COLUMN invoice_signed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.interventions.invoice_signature_data IS 'Données de signature du client sur la facture finale (format base64/svg)';
COMMENT ON COLUMN public.interventions.invoice_signed_at IS 'Date et heure de signature de la facture par le client';