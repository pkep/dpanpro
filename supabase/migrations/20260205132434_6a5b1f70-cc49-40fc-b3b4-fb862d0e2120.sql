-- Add is_enabled column to priority_multipliers table
ALTER TABLE public.priority_multipliers 
ADD COLUMN is_enabled boolean NOT NULL DEFAULT true;