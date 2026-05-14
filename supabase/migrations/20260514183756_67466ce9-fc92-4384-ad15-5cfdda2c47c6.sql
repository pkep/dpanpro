-- Modifier le type de invoice_signed_at pour retirer le timezone
ALTER TABLE public.interventions 
ALTER COLUMN invoice_signed_at TYPE timestamp without time zone;