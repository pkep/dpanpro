-- Drop existing RLS policies on technician_payouts
DROP POLICY IF EXISTS "Admins and managers can manage payouts" ON public.technician_payouts;
DROP POLICY IF EXISTS "Technicians can view their own payouts" ON public.technician_payouts;

-- Create new permissive policies since app uses custom auth (not Supabase Auth)
CREATE POLICY "Anyone can manage payouts"
ON public.technician_payouts
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can view payouts"
ON public.technician_payouts
FOR SELECT
USING (true);