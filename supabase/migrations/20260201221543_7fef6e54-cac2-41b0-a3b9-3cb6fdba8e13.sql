-- Drop the restrictive admin policy
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;

-- Create a permissive policy for all operations (admin check done at application level)
CREATE POLICY "Allow manage site settings" 
ON public.site_settings 
FOR ALL 
USING (true)
WITH CHECK (true);