-- ============================================================
-- FICHIER CONSOLIDÉ DE TOUTES LES MIGRATIONS
-- Généré automatiquement - À mettre à jour à chaque nouvelle migration
-- Dernière mise à jour : 2026-02-22
-- ============================================================

-- ============================================================
-- Migration: 20260118001610 - Création tables users et interventions
-- ============================================================

-- Table des utilisateurs (schéma public, pas auth.users)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'technician', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table des interventions
CREATE TABLE public.interventions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('plumbing', 'electricity', 'heating', 'locksmith', 'other')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_progress', 'completed', 'cancelled')),
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  estimated_price NUMERIC(10,2),
  final_price NUMERIC(10,2),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  photos TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les performances
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_interventions_client ON public.interventions(client_id);
CREATE INDEX idx_interventions_technician ON public.interventions(technician_id);
CREATE INDEX idx_interventions_status ON public.interventions(status);
CREATE INDEX idx_interventions_is_active ON public.interventions(is_active);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interventions_updated_at
  BEFORE UPDATE ON public.interventions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

-- Politique temporaire permissive (à sécuriser avec l'authentification custom)
CREATE POLICY "Allow all for users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for interventions" ON public.interventions FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- Migration: 20260118002000 - Mise à jour contraintes catégorie et status
-- ============================================================

-- Mettre à jour la contrainte de catégorie pour inclure glazing et aircon
ALTER TABLE public.interventions DROP CONSTRAINT interventions_category_check;
ALTER TABLE public.interventions ADD CONSTRAINT interventions_category_check 
  CHECK (category IN ('plumbing', 'electricity', 'heating', 'locksmith', 'glazing', 'aircon', 'other'));

-- Mettre à jour la contrainte de status pour inclure en_route
ALTER TABLE public.interventions DROP CONSTRAINT interventions_status_check;
ALTER TABLE public.interventions ADD CONSTRAINT interventions_status_check 
  CHECK (status IN ('new', 'assigned', 'en_route', 'in_progress', 'completed', 'cancelled'));


-- ============================================================
-- Migration: 20260118012100 - Historique des interventions + realtime
-- ============================================================

-- Create table for intervention history/modifications tracking
CREATE TABLE public.intervention_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'status_changed', 'assigned', 'updated', 'comment')),
  old_value TEXT,
  new_value TEXT,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intervention_history ENABLE ROW LEVEL SECURITY;

-- Create policy for reading history
CREATE POLICY "Allow read for intervention_history"
ON public.intervention_history
FOR SELECT
USING (true);

-- Create policy for inserting history
CREATE POLICY "Allow insert for intervention_history"
ON public.intervention_history
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_intervention_history_intervention_id ON public.intervention_history(intervention_id);
CREATE INDEX idx_intervention_history_created_at ON public.intervention_history(created_at DESC);

-- Enable realtime for interventions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.interventions;


-- ============================================================
-- Migration: 20260118013819 - Storage bucket pour photos d'intervention
-- ============================================================

-- Create storage bucket for intervention photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('intervention-photos', 'intervention-photos', true);

-- Policy: Allow authenticated users to upload photos
CREATE POLICY "Allow upload intervention photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'intervention-photos');

-- Policy: Allow public read access to photos
CREATE POLICY "Allow public read intervention photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'intervention-photos');

-- Policy: Allow users to delete their own photos
CREATE POLICY "Allow delete intervention photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'intervention-photos');


-- ============================================================
-- Migration: 20260118020118 - Table des notes/avis interventions
-- ============================================================

-- Create table for intervention ratings/reviews
CREATE TABLE public.intervention_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(intervention_id) -- Only one rating per intervention
);

-- Enable RLS
ALTER TABLE public.intervention_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Clients can insert ratings for their own completed interventions
CREATE POLICY "Clients can insert their own ratings"
ON public.intervention_ratings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interventions
    WHERE interventions.id = intervention_id
    AND interventions.client_id = client_id
    AND interventions.status = 'completed'
  )
);

-- Policy: Anyone can read ratings
CREATE POLICY "Anyone can read ratings"
ON public.intervention_ratings
FOR SELECT
USING (true);

-- Policy: Clients can update their own ratings
CREATE POLICY "Clients can update their own ratings"
ON public.intervention_ratings
FOR UPDATE
USING (true)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.interventions
    WHERE interventions.id = intervention_id
    AND interventions.client_id = client_id
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_intervention_ratings_updated_at
BEFORE UPDATE ON public.intervention_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- Migration: 20260119002657 - Tables services et demandes partenaire
-- ============================================================

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


-- ============================================================
-- Migration: 20260119182510 - Tracking code + contacts client invité
-- ============================================================

-- Add tracking_code column to interventions
ALTER TABLE public.interventions
ADD COLUMN tracking_code TEXT UNIQUE;

-- Add client contact info for guest interventions
ALTER TABLE public.interventions
ADD COLUMN client_email TEXT,
ADD COLUMN client_phone TEXT;

-- Create function to generate tracking code
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'DP-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate tracking code and title on insert
CREATE OR REPLACE FUNCTION public.set_intervention_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate tracking code if not provided
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := public.generate_tracking_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_intervention_defaults_trigger
BEFORE INSERT ON public.interventions
FOR EACH ROW
EXECUTE FUNCTION public.set_intervention_defaults();


-- ============================================================
-- Migration: 20260119232625 - Prix de base services + multiplicateurs priorité
-- ============================================================

-- Add base_price and default_priority columns to services table
ALTER TABLE public.services 
ADD COLUMN base_price numeric NOT NULL DEFAULT 0,
ADD COLUMN default_priority text NOT NULL DEFAULT 'normal';

-- Create priority_multipliers table for configurable urgency coefficients
CREATE TABLE public.priority_multipliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority text NOT NULL UNIQUE,
  multiplier numeric NOT NULL DEFAULT 1.0,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.priority_multipliers ENABLE ROW LEVEL SECURITY;

-- RLS policies for priority_multipliers
CREATE POLICY "Priority multipliers are viewable by everyone" 
ON public.priority_multipliers 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage priority multipliers" 
ON public.priority_multipliers 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_priority_multipliers_updated_at
BEFORE UPDATE ON public.priority_multipliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- Migration: 20260120141338 - Tables devis + autorisations paiement
-- ============================================================

-- Table pour stocker les lignes de devis par intervention
CREATE TABLE public.intervention_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL,
  label TEXT NOT NULL,
  base_price NUMERIC NOT NULL DEFAULT 0,
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  calculated_price NUMERIC NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour stocker les autorisations de paiement (provider-agnostic)
CREATE TABLE public.payment_authorizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  payment_provider TEXT NOT NULL DEFAULT 'stripe',
  provider_payment_id TEXT,
  provider_customer_id TEXT,
  amount_authorized NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending',
  client_email TEXT,
  client_phone TEXT,
  authorization_requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  authorization_confirmed_at TIMESTAMP WITH TIME ZONE,
  captured_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intervention_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_authorizations ENABLE ROW LEVEL SECURITY;

-- Policies for intervention_quotes
CREATE POLICY "Anyone can view intervention quotes"
ON public.intervention_quotes
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert intervention quotes"
ON public.intervention_quotes
FOR INSERT
WITH CHECK (true);

-- Policies for payment_authorizations
CREATE POLICY "Anyone can view payment authorizations"
ON public.payment_authorizations
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert payment authorizations"
ON public.payment_authorizations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update payment authorizations"
ON public.payment_authorizations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Trigger for updated_at on payment_authorizations
CREATE TRIGGER update_payment_authorizations_updated_at
BEFORE UPDATE ON public.payment_authorizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_intervention_quotes_intervention_id ON public.intervention_quotes(intervention_id);
CREATE INDEX idx_payment_authorizations_intervention_id ON public.payment_authorizations(intervention_id);
CREATE INDEX idx_payment_authorizations_provider_payment_id ON public.payment_authorizations(provider_payment_id);


-- ============================================================
-- Migration: 20260120154230 - Lien partner_applications -> users
-- ============================================================

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


-- ============================================================
-- Migration: 20260120170024 - Nettoyage partner_applications + géolocation
-- ============================================================

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


-- ============================================================
-- Migration: 20260120174803 - Dispatch + disponibilité techniciens
-- ============================================================

-- Table pour suivre les tentatives de dispatch
CREATE TABLE public.dispatch_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  score_breakdown JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'timeout', 'cancelled')),
  attempt_order INTEGER NOT NULL DEFAULT 1,
  notified_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  timeout_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour la disponibilité des techniciens
CREATE TABLE public.technician_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  is_available BOOLEAN NOT NULL DEFAULT true,
  current_intervention_id UUID REFERENCES public.interventions(id) ON DELETE SET NULL,
  max_concurrent_interventions INTEGER NOT NULL DEFAULT 3,
  last_status_change TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dispatch_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_availability ENABLE ROW LEVEL SECURITY;

-- Policies for dispatch_attempts
CREATE POLICY "Admins can manage dispatch attempts"
ON public.dispatch_attempts
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Technicians can view their own attempts"
ON public.dispatch_attempts
FOR SELECT
USING (true);

CREATE POLICY "Technicians can update their own attempts"
ON public.dispatch_attempts
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Policies for technician_availability
CREATE POLICY "Anyone can view availability"
ON public.technician_availability
FOR SELECT
USING (true);

CREATE POLICY "Technicians can manage their availability"
ON public.technician_availability
FOR ALL
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_dispatch_attempts_intervention ON public.dispatch_attempts(intervention_id);
CREATE INDEX idx_dispatch_attempts_technician ON public.dispatch_attempts(technician_id);
CREATE INDEX idx_dispatch_attempts_status ON public.dispatch_attempts(status);
CREATE INDEX idx_dispatch_attempts_timeout ON public.dispatch_attempts(timeout_at) WHERE status = 'pending';
CREATE INDEX idx_technician_availability_available ON public.technician_availability(technician_id) WHERE is_available = true;

-- Triggers for updated_at
CREATE TRIGGER update_dispatch_attempts_updated_at
BEFORE UPDATE ON public.dispatch_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technician_availability_updated_at
BEFORE UPDATE ON public.technician_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for dispatch_attempts
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_attempts;


-- ============================================================
-- Migration: 20260122002220 - Tables refus/annulations interventions
-- ============================================================

-- Create table to track declined interventions with reasons
CREATE TABLE public.declined_interventions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL,
  technician_id UUID NOT NULL,
  reason TEXT NOT NULL,
  declined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to track cancelled assignments with reasons
CREATE TABLE public.cancelled_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL,
  technician_id UUID NOT NULL,
  reason TEXT NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.declined_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancelled_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for declined_interventions
CREATE POLICY "Technicians can view their own declines"
  ON public.declined_interventions
  FOR SELECT
  USING (true);

CREATE POLICY "Technicians can insert their own declines"
  ON public.declined_interventions
  FOR INSERT
  WITH CHECK (true);

-- RLS policies for cancelled_assignments
CREATE POLICY "Anyone can view cancelled assignments"
  ON public.cancelled_assignments
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert cancelled assignments"
  ON public.cancelled_assignments
  FOR INSERT
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_declined_interventions_technician ON public.declined_interventions(technician_id);
CREATE INDEX idx_declined_interventions_intervention ON public.declined_interventions(intervention_id);
CREATE INDEX idx_cancelled_assignments_intervention ON public.cancelled_assignments(intervention_id);


-- ============================================================
-- Migration: 20260123003850 - Modifications devis + messages + chat
-- ============================================================

-- Table pour les modifications de devis (ajouts de prestations/équipements)
CREATE TABLE public.quote_modifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  total_additional_amount NUMERIC NOT NULL DEFAULT 0,
  client_notified_at TIMESTAMP WITH TIME ZONE,
  client_responded_at TIMESTAMP WITH TIME ZONE,
  notification_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les lignes de modification de devis
CREATE TABLE public.quote_modification_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modification_id UUID NOT NULL REFERENCES public.quote_modifications(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'equipment', 'other')),
  label TEXT NOT NULL,
  description TEXT,
  unit_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les messages chat entre technicien et client
CREATE TABLE public.intervention_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('technician', 'client')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quote_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_modification_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for quote_modifications
CREATE POLICY "Anyone can view quote modifications"
  ON public.quote_modifications FOR SELECT USING (true);

CREATE POLICY "Technicians can insert quote modifications"
  ON public.quote_modifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update quote modifications"
  ON public.quote_modifications FOR UPDATE USING (true) WITH CHECK (true);

-- RLS policies for quote_modification_items
CREATE POLICY "Anyone can view quote modification items"
  ON public.quote_modification_items FOR SELECT USING (true);

CREATE POLICY "Technicians can insert quote modification items"
  ON public.quote_modification_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete quote modification items"
  ON public.quote_modification_items FOR DELETE USING (true);

-- RLS policies for intervention_messages
CREATE POLICY "Anyone can view intervention messages"
  ON public.intervention_messages FOR SELECT USING (true);

CREATE POLICY "Anyone can insert intervention messages"
  ON public.intervention_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update intervention messages"
  ON public.intervention_messages FOR UPDATE USING (true) WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.intervention_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_modifications;

-- Triggers for updated_at
CREATE TRIGGER update_quote_modifications_updated_at
  BEFORE UPDATE ON public.quote_modifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_quote_modifications_intervention ON public.quote_modifications(intervention_id);
CREATE INDEX idx_quote_modifications_token ON public.quote_modifications(notification_token);
CREATE INDEX idx_quote_modification_items_modification ON public.quote_modification_items(modification_id);
CREATE INDEX idx_intervention_messages_intervention ON public.intervention_messages(intervention_id);


-- ============================================================
-- Migration: 20260123013311 - Mise à jour contrainte status (en_route + on_route)
-- ============================================================

-- Step 1: Drop the old constraint
ALTER TABLE public.interventions DROP CONSTRAINT IF EXISTS interventions_status_check;

-- Step 2: Add new constraint that accepts both en_route and on_route temporarily
ALTER TABLE public.interventions ADD CONSTRAINT interventions_status_check 
  CHECK (status IN ('new', 'assigned', 'en_route', 'on_route', 'in_progress', 'completed', 'cancelled'));


-- ============================================================
-- Migration: 20260123013350 - Nettoyage status (on_route uniquement)
-- ============================================================

-- Remove en_route from the constraint, keeping only on_route
ALTER TABLE public.interventions DROP CONSTRAINT IF EXISTS interventions_status_check;
ALTER TABLE public.interventions ADD CONSTRAINT interventions_status_check 
  CHECK (status IN ('new', 'assigned', 'on_route', 'in_progress', 'completed', 'cancelled'));


-- ============================================================
-- Migration: 20260123043015 - Colonnes timing + statistiques partenaires
-- ============================================================

-- Add timing columns to interventions table
ALTER TABLE public.interventions
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS response_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS travel_time_seconds INTEGER,
ADD COLUMN IF NOT EXISTS intervention_duration_seconds INTEGER;

-- Create partner_statistics table
CREATE TABLE public.partner_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL UNIQUE,
  average_rating NUMERIC(3,2),
  total_interventions INTEGER NOT NULL DEFAULT 0,
  completed_interventions INTEGER NOT NULL DEFAULT 0,
  average_response_time_seconds INTEGER,
  average_arrival_time_seconds INTEGER,
  average_intervention_time_seconds INTEGER,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partner_statistics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view partner statistics"
ON public.partner_statistics
FOR SELECT
USING (true);

CREATE POLICY "System can manage partner statistics"
ON public.partner_statistics
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_partner_statistics_updated_at
BEFORE UPDATE ON public.partner_statistics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_partner_statistics_partner_id ON public.partner_statistics(partner_id);
CREATE INDEX idx_interventions_technician_completed ON public.interventions(technician_id, status) WHERE status = 'completed';

-- Enable realtime for partner_statistics
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_statistics;


-- ============================================================
-- Migration: 20260123043517 - Table commissions
-- ============================================================

-- Create commission configuration table
CREATE TABLE public.commission_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID UNIQUE,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 15.00,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view commission settings"
ON public.commission_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage commission settings"
ON public.commission_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_commission_settings_updated_at
BEFORE UPDATE ON public.commission_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default global commission rate (15%)
INSERT INTO public.commission_settings (partner_id, commission_rate)
VALUES (NULL, 15.00);


-- ============================================================
-- Migration: 20260123044357 - Planning techniciens
-- ============================================================

-- Create table for technician working schedules
CREATE TABLE public.technician_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '18:00:00',
  is_working_day BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(technician_id, day_of_week)
);

-- Create table for specific day overrides (vacations, special hours)
CREATE TABLE public.technician_schedule_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(technician_id, override_date)
);

-- Enable RLS
ALTER TABLE public.technician_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_schedule_overrides ENABLE ROW LEVEL SECURITY;

-- RLS policies for technician_schedules
CREATE POLICY "Technicians can view all schedules"
ON public.technician_schedules
FOR SELECT
USING (true);

CREATE POLICY "Technicians can manage their own schedule"
ON public.technician_schedules
FOR ALL
USING (true)
WITH CHECK (true);

-- RLS policies for technician_schedule_overrides
CREATE POLICY "Anyone can view schedule overrides"
ON public.technician_schedule_overrides
FOR SELECT
USING (true);

CREATE POLICY "Technicians can manage their own overrides"
ON public.technician_schedule_overrides
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_technician_schedules_updated_at
BEFORE UPDATE ON public.technician_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technician_schedule_overrides_updated_at
BEFORE UPDATE ON public.technician_schedule_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- Migration: 20260126114020 - Client_id nullable + RLS invités
-- ============================================================

-- Permettre aux interventions d'avoir un client_id nullable pour les invités
ALTER TABLE public.interventions
  ALTER COLUMN client_id DROP NOT NULL;

-- Supprimer la contrainte de clé étrangère si elle existe
ALTER TABLE public.interventions
  DROP CONSTRAINT IF EXISTS interventions_client_id_fkey;

-- Mettre à jour la politique RLS pour permettre aux invités de créer des interventions
DROP POLICY IF EXISTS "Anyone can create interventions" ON public.interventions;
CREATE POLICY "Anyone can create interventions"
  ON public.interventions
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view interventions" ON public.interventions;
CREATE POLICY "Anyone can view interventions"
  ON public.interventions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can update interventions" ON public.interventions;
CREATE POLICY "Anyone can update interventions"
  ON public.interventions
  FOR UPDATE
  USING (true);


-- ============================================================
-- Migration: 20260126132529 - Notifications push (FCM)
-- ============================================================

-- Create push_subscriptions table for storing FCM tokens (for both users and guests)
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  email TEXT NULL,
  fcm_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  device_info JSONB NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_or_email_required CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

-- Create indexes for fast lookups
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_push_subscriptions_email ON public.push_subscriptions(email) WHERE email IS NOT NULL;
CREATE INDEX idx_push_subscriptions_fcm_token ON public.push_subscriptions(fcm_token);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow public registration (for guests)
CREATE POLICY "Anyone can register push subscription"
ON public.push_subscriptions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (true);

CREATE POLICY "Anyone can update their push subscription"
ON public.push_subscriptions FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete push subscription"
ON public.push_subscriptions FOR DELETE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- Migration: 20260129101926 - Tokens de réinitialisation mot de passe
-- ============================================================

-- Create password reset tokens table
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can insert password reset tokens"
ON public.password_reset_tokens
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can select password reset tokens"
ON public.password_reset_tokens
FOR SELECT
USING (true);

CREATE POLICY "Anyone can update password reset tokens"
ON public.password_reset_tokens
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Index for faster token lookup
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);


-- ============================================================
-- Migration: 20260129163706 - Notes technicien sur clients
-- ============================================================

-- Create table for technician ratings of clients
CREATE TABLE public.technician_client_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(intervention_id)
);

-- Enable RLS
ALTER TABLE public.technician_client_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Technicians can insert their own ratings"
ON public.technician_client_ratings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Technicians can update their own ratings"
ON public.technician_client_ratings
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can view technician client ratings"
ON public.technician_client_ratings
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_technician_client_ratings_updated_at
BEFORE UPDATE ON public.technician_client_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- Migration: 20260129234438 - Rôles, permissions, config dispatch, historique config
-- ============================================================

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


-- ============================================================
-- Migration: 20260130001049 - Versements techniciens + litiges
-- ============================================================

-- Create technician_payouts table for tracking payments
CREATE TABLE public.technician_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payout_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create disputes table for tracking client disputes
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.users(id),
  technician_id UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'open',
  client_notes TEXT,
  technician_notes TEXT,
  admin_notes TEXT,
  resolution TEXT,
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technician_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- RLS policies for technician_payouts
CREATE POLICY "Admins and managers can manage payouts"
ON public.technician_payouts
FOR ALL
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Technicians can view their own payouts"
ON public.technician_payouts
FOR SELECT
USING (true);

-- RLS policies for disputes
CREATE POLICY "Admins and managers can manage disputes"
ON public.disputes
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can view disputes"
ON public.disputes
FOR SELECT
USING (true);

-- Create updated_at triggers
CREATE TRIGGER update_technician_payouts_updated_at
BEFORE UPDATE ON public.technician_payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- Migration: 20260201115837 - Status arrived + photos travaux
-- ============================================================

-- 1. Update the status constraint to include 'arrived'
ALTER TABLE public.interventions 
DROP CONSTRAINT IF EXISTS interventions_status_check;

ALTER TABLE public.interventions 
ADD CONSTRAINT interventions_status_check 
CHECK (status IN ('new', 'assigned', 'on_route', 'arrived', 'in_progress', 'completed', 'cancelled'));

-- 2. Create table for technician work photos (before/after)
CREATE TABLE public.intervention_work_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after')),
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.intervention_work_photos ENABLE ROW LEVEL SECURITY;

-- Policy: Technicians can insert their own photos
CREATE POLICY "Technicians can insert work photos"
ON public.intervention_work_photos
FOR INSERT
WITH CHECK (true);

-- Policy: Technicians can view photos for their interventions, admins/managers can view all
CREATE POLICY "Authorized users can view work photos"
ON public.intervention_work_photos
FOR SELECT
USING (
  uploaded_by = auth.uid()
  OR
  is_admin_or_manager(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM interventions i 
    WHERE i.id = intervention_work_photos.intervention_id 
    AND i.technician_id = auth.uid()
  )
);

-- Policy: Only uploader or admin can delete
CREATE POLICY "Authorized users can delete work photos"
ON public.intervention_work_photos
FOR DELETE
USING (
  uploaded_by = auth.uid()
  OR
  is_admin_or_manager(auth.uid())
);

-- Create index for faster lookups
CREATE INDEX idx_intervention_work_photos_intervention ON public.intervention_work_photos(intervention_id);
CREATE INDEX idx_intervention_work_photos_type ON public.intervention_work_photos(photo_type);


-- ============================================================
-- Migration: 20260201134638 - Fix policy insert photos travaux
-- ============================================================

-- Drop the existing restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Technicians can insert work photos" ON public.intervention_work_photos;

-- Create a permissive INSERT policy
CREATE POLICY "Technicians can insert work photos" 
ON public.intervention_work_photos 
FOR INSERT 
TO public
WITH CHECK (true);


-- ============================================================
-- Migration: 20260201165919 - Champs entreprise users + TVA services
-- ============================================================

-- Add company fields to users table
ALTER TABLE public.users
ADD COLUMN is_company boolean NOT NULL DEFAULT false,
ADD COLUMN company_name text,
ADD COLUMN siren text,
ADD COLUMN vat_number text;

-- Add VAT rates to services table (10% for individuals, 20% for professionals)
ALTER TABLE public.services
ADD COLUMN vat_rate_individual numeric NOT NULL DEFAULT 10.0,
ADD COLUMN vat_rate_professional numeric NOT NULL DEFAULT 20.0;

-- Update existing services with default VAT rates
UPDATE public.services SET vat_rate_individual = 10.0, vat_rate_professional = 20.0;


-- ============================================================
-- Migration: 20260201205829 - Composants prix services
-- ============================================================

-- Add price component columns to services table
ALTER TABLE public.services
ADD COLUMN displacement_price numeric NOT NULL DEFAULT 0,
ADD COLUMN security_price numeric NOT NULL DEFAULT 0,
ADD COLUMN repair_price numeric NOT NULL DEFAULT 0;

-- Update existing services with price breakdown based on current base_price ratios
UPDATE public.services SET
  displacement_price = ROUND(base_price * 0.25, 2),
  security_price = ROUND(base_price * 0.25, 2),
  repair_price = ROUND(base_price * 0.50, 2)
WHERE base_price > 0;


-- ============================================================
-- Migration: 20260201220950 - Paramètres du site
-- ============================================================

-- Create site_settings table for global configuration
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view settings
CREATE POLICY "Anyone can view site settings" 
ON public.site_settings 
FOR SELECT 
USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage site settings" 
ON public.site_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default phone number
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES ('phone_number', '0 800 123 456', 'Numéro de téléphone standard affiché sur le site');


-- ============================================================
-- Migration: 20260201221543 - Fix RLS site_settings (permissif)
-- ============================================================

-- Drop the restrictive admin policy
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;

-- Create a permissive policy for all operations (admin check done at application level)
CREATE POLICY "Allow manage site settings" 
ON public.site_settings 
FOR ALL 
USING (true)
WITH CHECK (true);


-- ============================================================
-- Migration: 20260202194156 - Photos profil techniciens + storage bucket
-- ============================================================

-- Add avatar_url and company_logo_url to users table for technician photos
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS company_logo_url text;

-- Create storage bucket for technician profile photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('technician-photos', 'technician-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for technician photos bucket
CREATE POLICY "Anyone can view technician photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'technician-photos');

CREATE POLICY "Authenticated users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'technician-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'technician-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'technician-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================
-- Migration: 20260202195140 - Fix RLS storage technician-photos (permissif)
-- ============================================================

-- Drop existing restrictive policies on technician-photos bucket
DROP POLICY IF EXISTS "Technicians can upload their photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can update their photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can delete their photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view technician photos" ON storage.objects;

-- Create permissive policies for technician-photos bucket (using custom auth)
CREATE POLICY "Allow uploads to technician-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'technician-photos');

CREATE POLICY "Allow updates to technician-photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'technician-photos')
WITH CHECK (bucket_id = 'technician-photos');

CREATE POLICY "Allow deletes from technician-photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'technician-photos');

CREATE POLICY "Allow public read technician-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'technician-photos');


-- ============================================================
-- Migration: 20260202211307 - Fix RLS technician_payouts (permissif)
-- ============================================================

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


-- ============================================================
-- Migration: 20260202215611 - Mise à jour contrainte rôle users
-- ============================================================

-- Drop the existing check constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add a new check constraint that includes all valid roles
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'technician', 'client', 'guest'));


-- ============================================================
-- Migration: 20260204210640 - Champ must_change_password
-- ============================================================

-- Ajouter un champ pour forcer le changement de mot de passe à la première connexion
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;


-- ============================================================
-- Migration: 20260204214458 - Adresse entreprise users
-- ============================================================

-- (Fichier migration manquant ou vide)


-- ============================================================
-- Migration: 20260204232737 - Temps d'arrivée cible services
-- ============================================================

-- Add target arrival time to services (in minutes)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS target_arrival_time_minutes integer DEFAULT 30;

-- Add comments for clarity
COMMENT ON COLUMN public.services.target_arrival_time_minutes IS 'Target time in minutes for technician to arrive on site after accepting intervention';


-- ============================================================
-- Migration: 20260205132049 - Raison refus modification devis
-- ============================================================

-- Add decline_reason column to quote_modifications
ALTER TABLE public.quote_modifications 
ADD COLUMN IF NOT EXISTS decline_reason TEXT;


-- ============================================================
-- Migration: 20260205132434 - Setting multiplicateur priorité
-- ============================================================

-- Add setting for priority multiplier toggle
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES ('priority_multiplier_enabled', 'true', 'Active ou désactive l''application du coefficient multiplicateur de priorité sur les devis')
ON CONFLICT (setting_key) DO NOTHING;


-- ============================================================
-- Migration: 20260205174017 - Colonne is_enabled multiplicateurs priorité
-- ============================================================

-- Add is_enabled column to priority_multipliers table
ALTER TABLE public.priority_multipliers 
ADD COLUMN is_enabled boolean NOT NULL DEFAULT true;


-- ============================================================
-- Migration: 20260210231827 - Signature devis + PDF
-- ============================================================

-- Add quote signature fields to interventions table
ALTER TABLE public.interventions
ADD COLUMN quote_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN quote_signature_data TEXT,
ADD COLUMN quote_pdf_url TEXT;

-- Comment on columns
COMMENT ON COLUMN public.interventions.quote_signed_at IS 'Timestamp when client signed the initial quote';
COMMENT ON COLUMN public.interventions.quote_signature_data IS 'Base64 encoded signature image';
COMMENT ON COLUMN public.interventions.quote_pdf_url IS 'URL of the signed quote PDF in storage';


-- ============================================================
-- NOTE: La migration 20260204214458 (adresse entreprise) n'a pas été trouvée
-- mais la colonne company_address existe dans le schéma actuel.
-- Si nécessaire, voici la commande :
-- ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_address text;
-- ============================================================

-- ============================================================
-- NOTE: La migration pour rendre intervention_id nullable dans
-- payment_authorizations n'est pas listée ci-dessus mais existe :
-- ALTER TABLE public.payment_authorizations ALTER COLUMN intervention_id DROP NOT NULL;
-- ============================================================
