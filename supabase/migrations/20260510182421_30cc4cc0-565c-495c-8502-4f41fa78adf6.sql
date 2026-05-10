-- Drop existing restrictive policies on user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers with permission can create manager roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Permissive policies aligned with the rest of the project (custom auth)
CREATE POLICY "Anyone can view user roles"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert user roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update user roles"
  ON public.user_roles FOR UPDATE
  USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete user roles"
  ON public.user_roles FOR DELETE
  USING (true);