-- Add user_id column to partner_applications to link to users table
ALTER TABLE public.partner_applications 
ADD COLUMN user_id uuid REFERENCES public.users(id) ON DELETE CASCADE;

-- Make the duplicated columns nullable since they'll be in users table
ALTER TABLE public.partner_applications 
ALTER COLUMN first_name DROP NOT NULL,
ALTER COLUMN last_name DROP NOT NULL,
ALTER COLUMN email DROP NOT NULL,
ALTER COLUMN password_hash DROP NOT NULL,
ALTER COLUMN phone DROP NOT NULL;

-- Create index for faster lookups
CREATE INDEX idx_partner_applications_user_id ON public.partner_applications(user_id);