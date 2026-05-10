-- Add certifications column to partner_applications table
ALTER TABLE public.partner_applications
ADD COLUMN certifications TEXT[] NOT NULL DEFAULT '{}';