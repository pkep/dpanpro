-- Add target arrival time to services (in minutes)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS target_arrival_time_minutes integer DEFAULT 30;

-- Add comments for clarity
COMMENT ON COLUMN public.services.target_arrival_time_minutes IS 'Target time in minutes for technician to arrive on site after accepting intervention';