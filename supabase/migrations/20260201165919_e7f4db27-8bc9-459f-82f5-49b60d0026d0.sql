-- Add company fields to users table
ALTER TABLE public.users
ADD COLUMN is_company boolean NOT NULL DEFAULT false,
ADD COLUMN company_name text,
ADD COLUMN siren text,
ADD COLUMN vat_number text;

-- Add VAT rates to services table (10% for individuals, 20% for professionals)
ALTER TABLE public.services
ADD COLUMN vat_rate_individual numeric NOT NULL DEFAULT 10.0,
ADD COLUMN vat_rate_professional numeric NOT NULL DEFAULT 20.0;

-- Update existing services with default VAT rates
UPDATE public.services SET vat_rate_individual = 10.0, vat_rate_professional = 20.0;