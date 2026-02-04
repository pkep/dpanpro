-- Add decline_reason column to quote_modifications
ALTER TABLE public.quote_modifications 
ADD COLUMN IF NOT EXISTS decline_reason TEXT;