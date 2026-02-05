-- Add quote signature fields to interventions table
ALTER TABLE public.interventions
ADD COLUMN quote_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN quote_signature_data TEXT,
ADD COLUMN quote_pdf_url TEXT;

-- Comment on columns
COMMENT ON COLUMN public.interventions.quote_signed_at IS 'Timestamp when client signed the initial quote';
COMMENT ON COLUMN public.interventions.quote_signature_data IS 'Base64 encoded signature image';
COMMENT ON COLUMN public.interventions.quote_pdf_url IS 'URL of the signed quote PDF in storage';