-- Add company_address column to users table for billing
ALTER TABLE public.users
ADD COLUMN company_address text;