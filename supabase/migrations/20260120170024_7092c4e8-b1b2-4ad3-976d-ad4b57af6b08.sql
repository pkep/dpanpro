-- Remove redundant columns from partner_applications (data now in users table)
ALTER TABLE public.partner_applications 
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS password_hash,
DROP COLUMN IF EXISTS phone;

-- Add geolocation columns for technician tracking
ALTER TABLE public.partner_applications 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS current_city text,
ADD COLUMN IF NOT EXISTS department text;

-- Create index for geolocation queries
CREATE INDEX IF NOT EXISTS idx_partner_applications_geolocation 
ON public.partner_applications (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;