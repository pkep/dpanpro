-- Add price component columns to services table
ALTER TABLE public.services
ADD COLUMN displacement_price numeric NOT NULL DEFAULT 0,
ADD COLUMN security_price numeric NOT NULL DEFAULT 0,
ADD COLUMN repair_price numeric NOT NULL DEFAULT 0;

-- Update existing services with price breakdown based on current base_price ratios
UPDATE public.services SET
  displacement_price = ROUND(base_price * 0.25, 2),
  security_price = ROUND(base_price * 0.25, 2),
  repair_price = ROUND(base_price * 0.50, 2)
WHERE base_price > 0;