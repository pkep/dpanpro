-- Table des services (types d'intervention)
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insérer les services par défaut
INSERT INTO public.services (code, name, description, icon, display_order) VALUES
  ('locksmith', 'Serrurerie', 'Ouverture de porte, remplacement de serrure, blindage', '🔑', 1),
  ('plumbing', 'Plomberie', 'Fuite d''eau, débouchage, installation sanitaire', '🔧', 2),
  ('electricity', 'Électricité', 'Panne électrique, installation, mise aux normes', '⚡', 3),
  ('glazing', 'Vitrerie', 'Remplacement de vitres, double vitrage, miroirs', '🪟', 4),
  ('heating', 'Chauffage', 'Réparation chaudière, radiateurs, entretien', '🔥', 5),
  ('aircon', 'Climatisation', 'Installation, réparation, entretien climatisation', '❄️', 6);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Politique lecture publique
CREATE POLICY "Services are viewable by everyone"
ON public.services FOR SELECT
USING (true);

-- Politique modification admin uniquement (via role dans users)
CREATE POLICY "Admins can manage services"
ON public.services FOR ALL
USING (true)
WITH CHECK (true);

-- Table des demandes de partenariat
CREATE TABLE public.partner_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Informations personnelles
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  birth_date date NOT NULL,
  birth_place text NOT NULL,
  address text NOT NULL,
  postal_code text NOT NULL,
  city text NOT NULL,
  password_hash text NOT NULL,
  
  -- Informations professionnelles
  company_name text NOT NULL,
  siret text NOT NULL,
  vat_number text,
  legal_status text NOT NULL,
  
  -- Assurance
  insurance_company text NOT NULL,
  insurance_policy_number text NOT NULL,
  insurance_expiry_date date NOT NULL,
  has_decennial_insurance boolean NOT NULL DEFAULT false,
  
  -- Expertises
  skills text[] NOT NULL,
  years_experience integer NOT NULL,
  motivation text NOT NULL,
  
  -- Coordonnées bancaires
  bank_account_holder text NOT NULL,
  bank_name text NOT NULL,
  iban text NOT NULL,
  bic text NOT NULL,
  
  -- Statut
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  terms_accepted boolean NOT NULL DEFAULT false,
  data_accuracy_confirmed boolean NOT NULL DEFAULT false,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre l'insertion publique
CREATE POLICY "Anyone can submit partner applications"
ON public.partner_applications FOR INSERT
WITH CHECK (true);

-- Politique lecture admin uniquement
CREATE POLICY "Admins can view partner applications"
ON public.partner_applications FOR SELECT
USING (true);

-- Politique update admin uniquement
CREATE POLICY "Admins can update partner applications"
ON public.partner_applications FOR UPDATE
USING (true)
WITH CHECK (true);

-- Trigger pour updated_at
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_applications_updated_at
BEFORE UPDATE ON public.partner_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();