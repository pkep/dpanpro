CREATE TYPE public.partner_availability AS ENUM ('week_day', 'evening', 'week_end', 'public_holidays', 'night', 'anytime');

ALTER TABLE public.partner_applications
ADD COLUMN availability public.partner_availability[] NOT NULL DEFAULT '{}';