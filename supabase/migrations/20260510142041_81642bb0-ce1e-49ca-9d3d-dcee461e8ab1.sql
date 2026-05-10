ALTER TABLE public.partner_applications
ADD COLUMN has_vehicle BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN zone TEXT DEFAULT NULL;