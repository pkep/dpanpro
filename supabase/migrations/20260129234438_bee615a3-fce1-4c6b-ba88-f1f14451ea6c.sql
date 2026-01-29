-- Create app_role enum type
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'technician', 'client', 'guest');

-- Create user_roles table for proper role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  UNIQUE (user_id, role)
);

-- Create manager_permissions table for granular permissions
CREATE TABLE public.manager_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  can_create_managers BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES public.users(id)
);

-- Create configuration_history table for versioning all config changes
CREATE TABLE public.configuration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL REFERENCES public.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_reason TEXT
);

-- Create dispatch_algorithm_config table for algorithm parameters
CREATE TABLE public.dispatch_algorithm_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_proximity INTEGER NOT NULL DEFAULT 40 CHECK (weight_proximity >= 0 AND weight_proximity <= 100),
  weight_skills INTEGER NOT NULL DEFAULT 30 CHECK (weight_skills >= 0 AND weight_skills <= 100),
  weight_workload INTEGER NOT NULL DEFAULT 20 CHECK (weight_workload >= 0 AND weight_workload <= 100),
  weight_rating INTEGER NOT NULL DEFAULT 10 CHECK (weight_rating >= 0 AND weight_rating <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.users(id),
  CONSTRAINT weights_sum_100 CHECK (weight_proximity + weight_skills + weight_workload + weight_rating = 100)
);

-- Enable RLS on all new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_algorithm_config ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- Security definer function to check if manager can create other managers
CREATE OR REPLACE FUNCTION public.can_create_managers(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.manager_permissions mp
    JOIN public.user_roles ur ON ur.user_id = mp.user_id
    WHERE mp.user_id = _user_id
      AND ur.role = 'manager'
      AND mp.can_create_managers = true
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Managers with permission can create manager roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.can_create_managers(auth.uid())
  AND role = 'manager'
);

-- RLS Policies for manager_permissions
CREATE POLICY "Admins can manage manager permissions"
ON public.manager_permissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view their own permissions"
ON public.manager_permissions
FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for configuration_history
CREATE POLICY "Admins and managers can view config history"
ON public.configuration_history
FOR SELECT
USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can insert config history"
ON public.configuration_history
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for dispatch_algorithm_config
CREATE POLICY "Anyone can view dispatch config"
ON public.dispatch_algorithm_config
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage dispatch config"
ON public.dispatch_algorithm_config
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at
CREATE TRIGGER update_manager_permissions_updated_at
BEFORE UPDATE ON public.manager_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dispatch_algorithm_config_updated_at
BEFORE UPDATE ON public.dispatch_algorithm_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default dispatch algorithm config
INSERT INTO public.dispatch_algorithm_config (weight_proximity, weight_skills, weight_workload, weight_rating, is_active)
VALUES (40, 30, 20, 10, true);