-- ============================================================
-- FICHIER CONSOLIDÉ DE TOUTES LES MIGRATIONS
-- Généré automatiquement depuis supabase/migrations/
-- Dernière mise à jour : 2026-06-20
-- ============================================================


-- ============================================================
-- Migration: 20260118001610_6e75d572-d34a-47ca-aed5-5d33f61f0691.sql
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

-- ============================================================
-- Migration: 20260118002000_26e5a0b2-a43b-4eda-ab53-bf2c7ca562a8.sql
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
-- Migration: 20260118012100_86e6714c-759d-44f0-8d5f-b959fbfb9751.sql
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

-- Create index for faster queries
CREATE INDEX idx_intervention_history_intervention_id ON public.intervention_history(intervention_id);
CREATE INDEX idx_intervention_history_created_at ON public.intervention_history(created_at DESC);

-- Enable realtime for interventions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.interventions;

-- ============================================================
-- Migration: 20260118020118_905cdbff-c794-4386-a548-e0797c38f6e9.sql
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

-- Create trigger for updated_at
CREATE TRIGGER update_intervention_ratings_updated_at
BEFORE UPDATE ON public.intervention_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Migration: 20260119002657_d992f84b-e02c-4c9b-9667-1fa942795c9d.sql
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
-- Migration: 20260119182510_b5089e80-68dd-4774-892a-c53e8595eee4.sql
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
-- Migration: 20260119232625_b669a471-028b-4df2-a013-c75c8ad9dc8d.sql
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

-- Create trigger for updated_at
CREATE TRIGGER update_priority_multipliers_updated_at
BEFORE UPDATE ON public.priority_multipliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Migration: 20260120141338_06b51468-07c3-4d56-95c8-1b9319419292.sql
-- ============================================================

-- Table pour stocker les lignes de devis par intervention
CREATE TABLE public.intervention_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL, -- 'displacement', 'security', 'repair'
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
  payment_provider TEXT NOT NULL DEFAULT 'stripe', -- 'stripe', 'paypal', etc.
  provider_payment_id TEXT, -- Stripe: payment_intent_id
  provider_customer_id TEXT, -- Stripe: customer_id
  amount_authorized NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'authorized', 'captured', 'cancelled', 'failed'
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
-- Migration: 20260120154230_9a45edce-693f-4acd-aa6b-bad0ea33ad5a.sql
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
-- Migration: 20260120170024_7092c4e8-b1b2-4ad3-976d-ad4b57af6b08.sql
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
-- Migration: 20260120174803_8b9c2f44-507d-444a-8408-8b1582348ff6.sql
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
-- Migration: 20260122002220_791637a0-06cc-4169-b968-1e20ffe94832.sql
-- ============================================================

-- Add 'en_route' status and 'to_reassign' status to interventions
-- These are already supported as text, no schema change needed

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

-- Add indexes for performance
CREATE INDEX idx_declined_interventions_technician ON public.declined_interventions(technician_id);
CREATE INDEX idx_declined_interventions_intervention ON public.declined_interventions(intervention_id);
CREATE INDEX idx_cancelled_assignments_intervention ON public.cancelled_assignments(intervention_id);

-- ============================================================
-- Migration: 20260123003850_505c372a-8679-4eec-99e6-1ef2312ccba6.sql
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
-- Migration: 20260123013311_533236a3-2245-4359-b570-e03707f948ce.sql
-- ============================================================

-- Step 1: Drop the old constraint
ALTER TABLE public.interventions DROP CONSTRAINT IF EXISTS interventions_status_check;

-- Step 2: Add new constraint that accepts both en_route and on_route temporarily
ALTER TABLE public.interventions ADD CONSTRAINT interventions_status_check 
  CHECK (status IN ('new', 'assigned', 'en_route', 'on_route', 'in_progress', 'completed', 'cancelled'));

-- ============================================================
-- Migration: 20260123013350_b7f967a5-845d-429f-a1fd-8e4fa9a66cb9.sql
-- ============================================================

-- Remove en_route from the constraint, keeping only on_route
ALTER TABLE public.interventions DROP CONSTRAINT IF EXISTS interventions_status_check;
ALTER TABLE public.interventions ADD CONSTRAINT interventions_status_check 
  CHECK (status IN ('new', 'assigned', 'on_route', 'in_progress', 'completed', 'cancelled'));

-- ============================================================
-- Migration: 20260123043015_471e50e7-68d6-431a-ab4e-6de0634e2c14.sql
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
-- Migration: 20260123043517_b8c09ef3-70cd-4886-8430-cab17ca497bc.sql
-- ============================================================

-- Create commission configuration table
CREATE TABLE public.commission_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID UNIQUE, -- NULL means global default
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 15.00, -- Percentage (e.g., 15.00 = 15%)
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

-- Add trigger for updated_at
CREATE TRIGGER update_commission_settings_updated_at
BEFORE UPDATE ON public.commission_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default global commission rate (15%)
INSERT INTO public.commission_settings (partner_id, commission_rate)
VALUES (NULL, 15.00);

-- ============================================================
-- Migration: 20260123044357_d55d2994-815c-4816-8768-b61539a30669.sql
-- ============================================================

-- Create table for technician working schedules
CREATE TABLE public.technician_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
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
-- Migration: 20260126114020_197ba5b6-d50f-4dd3-aaa4-bba7059fa393.sql
-- ============================================================

-- Permettre aux interventions d'avoir un client_id nullable pour les invités
ALTER TABLE public.interventions
  ALTER COLUMN client_id DROP NOT NULL;

-- Supprimer la contrainte de clé étrangère si elle existe
ALTER TABLE public.interventions
  DROP CONSTRAINT IF EXISTS interventions_client_id_fkey;

-- ============================================================
-- Migration: 20260126132529_ceca1b6a-2a35-41a5-8b13-fdc15370ed8c.sql
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

-- Trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Migration: 20260129101926_a2c5c738-500f-455f-b232-345a8be4cd7c.sql
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

-- Index for faster token lookup
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);

-- ============================================================
-- Migration: 20260129163706_e97264f0-6c2d-4d2b-99b9-1e5bfd0dd8aa.sql
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

-- Trigger for updated_at
CREATE TRIGGER update_technician_client_ratings_updated_at
BEFORE UPDATE ON public.technician_client_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Migration: 20260129234438_bee615a3-fce1-4c6b-ba88-f1f14451ea6c.sql
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
-- Migration: 20260130001049_474154d8-b46e-46cc-b039-3b8c886a1d3b.sql
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
-- Migration: 20260201115837_6e70e188-52cc-4e57-8a13-3b0aca3b6ae1.sql
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

-- Create index for faster lookups
CREATE INDEX idx_intervention_work_photos_intervention ON public.intervention_work_photos(intervention_id);
CREATE INDEX idx_intervention_work_photos_type ON public.intervention_work_photos(photo_type);

-- ============================================================
-- Migration: 20260201165919_e7f4db27-8bc9-459f-82f5-49b60d0026d0.sql
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
-- Migration: 20260201172514_e2af1927-21de-45f7-bb96-3ac2ef4d42c5.sql
-- ============================================================

-- Add company_address column to users table for billing
ALTER TABLE public.users
ADD COLUMN company_address text;

-- ============================================================
-- Migration: 20260201205829_6102d80a-0c6e-4d4b-b5c8-d2b4683ba89d.sql
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
-- Migration: 20260201220950_aebc613d-e635-44aa-9241-bc5de2e204c5.sql
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

-- Insert default phone number
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES ('phone_number', '0 800 123 456', 'Numéro de téléphone standard affiché sur le site');

-- ============================================================
-- Migration: 20260202194156_865403d2-791e-43b1-be22-9a1aad35c667.sql
-- ============================================================

-- Add avatar_url and company_logo_url to users table for technician photos
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS company_logo_url text;

-- ============================================================
-- Migration: 20260202215611_c4826953-a660-41b3-8273-98ce94d35d4b.sql
-- ============================================================

-- Drop the existing check constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add a new check constraint that includes all valid roles
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'technician', 'client', 'guest'));

-- ============================================================
-- Migration: 20260204210640_fd812fd9-9214-4949-a87e-20da60d8b715.sql
-- ============================================================

-- Ajouter un champ pour forcer le changement de mot de passe à la première connexion
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;

-- ============================================================
-- Migration: 20260204214458_da6cea15-ccb2-4f0d-abeb-c9af287840b2.sql
-- ============================================================

-- Add target arrival time to services (in minutes)
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS target_arrival_time_minutes integer DEFAULT 30;

-- Add comments for clarity
COMMENT ON COLUMN public.services.target_arrival_time_minutes IS 'Target time in minutes for technician to arrive on site after accepting intervention';

-- ============================================================
-- Migration: 20260204232737_23c2e2d9-a02c-4123-a492-8eac5ec2d2ef.sql
-- ============================================================

-- Add decline_reason column to quote_modifications
ALTER TABLE public.quote_modifications 
ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- ============================================================
-- Migration: 20260205132049_861758f9-d130-4e0e-a7ba-8501457d5e47.sql
-- ============================================================

-- Add setting for priority multiplier toggle
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES ('priority_multiplier_enabled', 'true', 'Active ou désactive l''application du coefficient multiplicateur de priorité sur les devis')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- Migration: 20260205132434_6a5b1f70-cc49-40fc-b3b4-fb862d0e2120.sql
-- ============================================================

-- Add is_enabled column to priority_multipliers table
ALTER TABLE public.priority_multipliers 
ADD COLUMN is_enabled boolean NOT NULL DEFAULT true;

-- ============================================================
-- Migration: 20260205174017_8cad0846-08a1-4ca9-8950-0a816bf15943.sql
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
-- Migration: 20260210231827_2664dec6-7a26-42eb-867c-74283b23506c.sql
-- ============================================================

-- Make intervention_id nullable so we can create payment authorizations before interventions
ALTER TABLE public.payment_authorizations ALTER COLUMN intervention_id DROP NOT NULL;

-- ============================================================
-- Migration: 20260304152210_dd414408-c65e-4dfb-85e2-1fd6fd66ec7d.sql
-- ============================================================


-- ============================================================
-- Questionnaire interactif - Tables pour le parcours V2
-- Structure arbre: domaines → questions → réponses → résultats
-- ============================================================

-- Table des résultats d'intervention (prestations finales avec pricing)
CREATE TABLE public.questionnaire_resultats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    domaine_code TEXT NOT NULL, -- maps to services.code (plumbing, electricity, etc.)
    slug TEXT NOT NULL UNIQUE,
    nom TEXT NOT NULL,
    description TEXT,
    prix_min DECIMAL(8,2),
    prix_max DECIMAL(8,2),
    unite_prix TEXT NOT NULL DEFAULT 'TTC_forfait', -- TTC_forfait, TTC_heure, TTC_m2, sur_devis
    duree_min_minutes INTEGER,
    duree_max_minutes INTEGER,
    urgence_disponible BOOLEAN NOT NULL DEFAULT true,
    garantie_jours INTEGER,
    image_url TEXT,
    notes_internes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des variantes (déclinaisons tarifées d'un résultat)
CREATE TABLE public.questionnaire_variantes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    resultat_id UUID NOT NULL REFERENCES public.questionnaire_resultats(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    description TEXT,
    prix_min DECIMAL(8,2),
    prix_max DECIMAL(8,2),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des questions (nœuds de l'arbre)
CREATE TABLE public.questionnaire_questions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    domaine_code TEXT NOT NULL, -- maps to services.code
    parent_reponse_id UUID, -- NULL = question racine du domaine
    libelle TEXT NOT NULL,
    sous_libelle TEXT,
    type_champ TEXT NOT NULL DEFAULT 'radio', -- radio, select, photo
    image_url TEXT,
    est_racine BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table des réponses (options cliquables)
CREATE TABLE public.questionnaire_reponses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE,
    next_question_id UUID REFERENCES public.questionnaire_questions(id),
    resultat_id UUID REFERENCES public.questionnaire_resultats(id),
    label TEXT NOT NULL,
    icone TEXT, -- emoji
    image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK for parent_reponse_id after reponses table exists
ALTER TABLE public.questionnaire_questions 
    ADD CONSTRAINT fk_parent_reponse 
    FOREIGN KEY (parent_reponse_id) 
    REFERENCES public.questionnaire_reponses(id);

-- Enable RLS
ALTER TABLE public.questionnaire_resultats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_variantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_reponses ENABLE ROW LEVEL SECURITY;

-- Add columns to interventions table for questionnaire result reference
ALTER TABLE public.interventions 
    ADD COLUMN IF NOT EXISTS questionnaire_resultat_id UUID REFERENCES public.questionnaire_resultats(id),
    ADD COLUMN IF NOT EXISTS questionnaire_answers JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS prix_min DECIMAL(8,2),
    ADD COLUMN IF NOT EXISTS prix_max DECIMAL(8,2);


-- ============================================================
-- Migration: 20260304213148_03b1c91f-d073-4a4f-ab68-dcf304e68d6f.sql
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_authorizations;

-- ============================================================
-- Migration: 20260304231159_ca88eca0-9328-48b6-bdd5-1644d574b920.sql
-- ============================================================


DO $$
DECLARE
  -- PLUMBING questions
  q_plumb_root uuid := gen_random_uuid();
  q_plumb_wc uuid := gen_random_uuid();
  q_plumb_wc_rempl uuid := gen_random_uuid();
  q_plumb_evier uuid := gen_random_uuid();
  q_plumb_douche uuid := gen_random_uuid();
  q_plumb_chauffe uuid := gen_random_uuid();
  q_plumb_chauffe_elec uuid := gen_random_uuid();
  q_plumb_canal uuid := gen_random_uuid();
  -- ELECTRICITY questions
  q_elec_root uuid := gen_random_uuid();
  q_elec_panne uuid := gen_random_uuid();
  q_elec_panne_disj uuid := gen_random_uuid();
  q_elec_install uuid := gen_random_uuid();
  -- LOCKSMITH questions
  q_lock_root uuid := gen_random_uuid();
  q_lock_bloque uuid := gen_random_uuid();
  q_lock_claquee uuid := gen_random_uuid();
  q_lock_verrouillee uuid := gen_random_uuid();
  q_lock_changer uuid := gen_random_uuid();
  q_lock_multipoints uuid := gen_random_uuid();
  q_lock_blindage uuid := gen_random_uuid();
  q_lock_autre uuid := gen_random_uuid();
  -- GLAZING questions
  q_glaz_root uuid := gen_random_uuid();
  q_glaz_cassee uuid := gen_random_uuid();
  q_glaz_dv uuid := gen_random_uuid();
  q_glaz_meca uuid := gen_random_uuid();
  q_glaz_etanch uuid := gen_random_uuid();
  -- HEATING questions
  q_heat_root uuid := gen_random_uuid();
  q_heat_gaz uuid := gen_random_uuid();
  q_heat_gaz_rempl uuid := gen_random_uuid();
  q_heat_rad uuid := gen_random_uuid();
  q_heat_fioul uuid := gen_random_uuid();
  -- AIRCON questions
  q_air_root uuid := gen_random_uuid();
  q_air_clim uuid := gen_random_uuid();
  q_air_install uuid := gen_random_uuid();
  q_air_panne uuid := gen_random_uuid();
  q_air_pac uuid := gen_random_uuid();

  -- PLUMBING results
  r_debouchage_wc uuid := gen_random_uuid();
  r_fuite_wc uuid := gen_random_uuid();
  r_chasse uuid := gen_random_uuid();
  r_pose_wc_std uuid := gen_random_uuid();
  r_pose_wc_susp uuid := gen_random_uuid();
  r_sanibroyeur uuid := gen_random_uuid();
  r_debouchage_evier uuid := gen_random_uuid();
  r_fuite_canal_app uuid := gen_random_uuid();
  r_changement_robinet uuid := gen_random_uuid();
  r_debouchage_douche uuid := gen_random_uuid();
  r_changement_robinet_douche uuid := gen_random_uuid();
  r_joints_douche uuid := gen_random_uuid();
  r_fuite_ce_elec uuid := gen_random_uuid();
  r_repar_ballon uuid := gen_random_uuid();
  r_rempl_ballon uuid := gen_random_uuid();
  r_ce_gaz uuid := gen_random_uuid();
  r_fuite_canal_enc uuid := gen_random_uuid();
  r_debouchage_colonne uuid := gen_random_uuid();
  -- ELECTRICITY results
  r_rempl_disj uuid := gen_random_uuid();
  r_rempl_tableau uuid := gen_random_uuid();
  r_panne_prises uuid := gen_random_uuid();
  r_depannage_eclairage uuid := gen_random_uuid();
  r_pose_prise uuid := gen_random_uuid();
  r_pose_luminaire uuid := gen_random_uuid();
  r_borne_irve uuid := gen_random_uuid();
  r_diag_elec uuid := gen_random_uuid();
  -- LOCKSMITH results
  r_ouv_claquee_std uuid := gen_random_uuid();
  r_ouv_claquee_blindee uuid := gen_random_uuid();
  r_ouv_verrou_std uuid := gen_random_uuid();
  r_ouv_verrou_blindee uuid := gen_random_uuid();
  r_ouv_cambrio uuid := gen_random_uuid();
  r_chg_cylindre uuid := gen_random_uuid();
  r_serrure_3pts uuid := gen_random_uuid();
  r_serrure_5pts uuid := gen_random_uuid();
  r_blindage_exist uuid := gen_random_uuid();
  r_porte_blindee uuid := gen_random_uuid();
  r_serrure_bal uuid := gen_random_uuid();
  r_serrure_portail uuid := gen_random_uuid();
  -- GLAZING results
  r_vitre_simple uuid := gen_random_uuid();
  r_fen_pvc uuid := gen_random_uuid();
  r_fen_alu uuid := gen_random_uuid();
  r_fen_bois uuid := gen_random_uuid();
  r_velux uuid := gen_random_uuid();
  r_cremone uuid := gen_random_uuid();
  r_poignee uuid := gen_random_uuid();
  r_rabotage uuid := gen_random_uuid();
  r_joints_fenetre uuid := gen_random_uuid();
  -- HEATING results
  r_depannage_gaz uuid := gen_random_uuid();
  r_entretien_gaz uuid := gen_random_uuid();
  r_rempl_chaud_std uuid := gen_random_uuid();
  r_rempl_chaud_cond uuid := gen_random_uuid();
  r_purge_rad uuid := gen_random_uuid();
  r_robinet_thermo uuid := gen_random_uuid();
  r_pose_rad uuid := gen_random_uuid();
  r_entretien_fioul uuid := gen_random_uuid();
  r_repar_fioul uuid := gen_random_uuid();
  -- AIRCON results
  r_clim_mono uuid := gen_random_uuid();
  r_clim_bi uuid := gen_random_uuid();
  r_clim_multi uuid := gen_random_uuid();
  r_entretien_clim uuid := gen_random_uuid();
  r_depannage_clim uuid := gen_random_uuid();
  r_fuite_eau_clim uuid := gen_random_uuid();
  r_bruit_clim uuid := gen_random_uuid();
  r_pac_air_air uuid := gen_random_uuid();
  r_pac_air_eau uuid := gen_random_uuid();
  r_entretien_pac uuid := gen_random_uuid();

BEGIN
  -- ========== RESULTATS ==========
  -- PLUMBING
  INSERT INTO questionnaire_resultats (id, domaine_code, slug, nom, description, prix_min, prix_max, unite_prix, duree_min_minutes, duree_max_minutes, urgence_disponible, garantie_jours, display_order) VALUES
  (r_debouchage_wc, 'plumbing', 'debouchage-wc', 'Débouchage WC', 'Intervention avec furet ou pression selon l''obstruction.', 100, 200, 'TTC_forfait', 30, 90, true, 2, 1),
  (r_fuite_wc, 'plumbing', 'fuite-wc', 'Fuite WC / joint de cuvette', 'Remplacement joint ou flexible de raccordement.', 80, 150, 'TTC_forfait', 30, 60, true, 365, 2),
  (r_chasse, 'plumbing', 'reparation-chasse', 'Réparation chasse d''eau', 'Remplacement mécanisme de chasse (flotteur, clapet, cloche).', 80, 150, 'TTC_forfait', 30, 60, true, 365, 3),
  (r_pose_wc_std, 'plumbing', 'pose-wc-standard', 'Pose WC standard', 'Dépose ancien WC + fourniture et pose WC posé.', 150, 300, 'TTC_forfait', 60, 120, false, 730, 4),
  (r_pose_wc_susp, 'plumbing', 'pose-wc-suspendu', 'Pose WC suspendu', 'Bâti support + cuvette suspendue + plaque de commande.', 200, 400, 'TTC_forfait', 120, 240, false, 730, 5),
  (r_sanibroyeur, 'plumbing', 'sanibroyeur', 'Fourniture + pose sanibroyeur', 'Installation complète avec évacuation broyée.', 900, 1100, 'TTC_forfait', 180, 300, false, 730, 6),
  (r_debouchage_evier, 'plumbing', 'debouchage-evier', 'Débouchage évier / lavabo', 'Débouchage par furet spirale ou aspiration haute pression.', 100, 180, 'TTC_forfait', 30, 60, true, 2, 7),
  (r_fuite_canal_app, 'plumbing', 'fuite-canalisation-apparente', 'Fuite canalisation apparente', 'Remplacement siphon, joint ou section de canalisation visible.', 100, 200, 'TTC_forfait', 30, 90, true, 365, 8),
  (r_changement_robinet, 'plumbing', 'changement-robinet', 'Changement robinet / mitigeur', 'Remplacement robinet simple ou mitigeur standard.', 80, 200, 'TTC_forfait', 30, 60, true, 365, 9),
  (r_debouchage_douche, 'plumbing', 'debouchage-douche', 'Débouchage douche / baignoire', 'Nettoyage du siphon et traitement de l''obstruction.', 100, 180, 'TTC_forfait', 30, 60, true, 2, 10),
  (r_changement_robinet_douche, 'plumbing', 'changement-robinet-douche', 'Changement robinet / mitigeur douche', 'Remplacement mitigeur de douche ou de baignoire.', 80, 200, 'TTC_forfait', 30, 60, true, 365, 11),
  (r_joints_douche, 'plumbing', 'joints-douche', 'Joints silicone douche / baignoire', 'Dépose anciens joints moisis + nettoyage + joints silicone sanitaire.', 80, 150, 'TTC_forfait', NULL, NULL, false, 365, 12),
  (r_fuite_ce_elec, 'plumbing', 'fuite-chauffe-eau-elec', 'Fuite chauffe-eau électrique', 'Remplacement groupe de sécurité, joint ou anode.', 100, 220, 'TTC_forfait', 60, 120, true, 365, 13),
  (r_repar_ballon, 'plumbing', 'reparation-ballon', 'Réparation ballon électrique', 'Diagnostic résistance, thermostat ou corrosion.', 100, 200, 'TTC_forfait', 60, 180, true, 365, 14),
  (r_rempl_ballon, 'plumbing', 'remplacement-ballon', 'Remplacement ballon électrique', 'Fourniture et pose d''un nouveau ballon selon capacité.', 350, 1500, 'TTC_forfait', 120, 240, false, 730, 15),
  (r_ce_gaz, 'plumbing', 'chauffe-eau-gaz', 'Chauffe-eau gaz — diagnostic', 'Intervention sur chauffe-eau gaz instantané ou à accumulation.', 150, 350, 'TTC_forfait', 60, 180, true, 365, 16),
  (r_fuite_canal_enc, 'plumbing', 'fuite-canalisation-encastree', 'Fuite canalisation encastrée', 'Recherche de fuite non destructive + réparation nécessitant ouverture.', 500, 1000, 'TTC_forfait', 120, 480, false, 365, 17),
  (r_debouchage_colonne, 'plumbing', 'debouchage-colonne', 'Débouchage colonne générale', 'Intervention sur colonne collective avec camion hydrocureur.', 700, 900, 'TTC_forfait', 120, 240, false, 2, 18);

  -- ELECTRICITY
  INSERT INTO questionnaire_resultats (id, domaine_code, slug, nom, description, prix_min, prix_max, unite_prix, duree_min_minutes, duree_max_minutes, urgence_disponible, garantie_jours, display_order) VALUES
  (r_rempl_disj, 'electricity', 'remplacement-disjoncteur', 'Remplacement disjoncteur différentiel', 'Diagnostic + remplacement du différentiel défaillant.', 150, 300, 'TTC_forfait', 60, 120, true, 365, 1),
  (r_rempl_tableau, 'electricity', 'remplacement-tableau', 'Remplacement tableau électrique', 'Dépose ancien tableau + pose nouveau tableau NF C 15-100.', 800, 2500, 'TTC_forfait', 240, 480, false, 730, 2),
  (r_panne_prises, 'electricity', 'panne-prises', 'Panne circuit prises', 'Diagnostic et réparation d''un circuit de prises défaillant.', 150, 300, 'TTC_forfait', 60, 180, true, 365, 3),
  (r_depannage_eclairage, 'electricity', 'depannage-eclairage', 'Dépannage circuit éclairage', 'Vérification circuit éclairage, remplacement interrupteur ou câble.', 150, 250, 'TTC_forfait', 60, 120, true, 365, 4),
  (r_pose_prise, 'electricity', 'pose-prise', 'Pose prise / interrupteur', 'Pose d''une prise 16A ou d''un interrupteur va-et-vient.', 80, 150, 'TTC_forfait', 30, 60, false, 365, 5),
  (r_pose_luminaire, 'electricity', 'pose-luminaire', 'Pose luminaire / spots', 'Branchement luminaire ou création de circuit spots encastrés.', 80, 300, 'TTC_forfait', 60, 180, false, 365, 6),
  (r_borne_irve, 'electricity', 'borne-irve', 'Installation borne IRVE', 'Pose borne de recharge véhicule électrique avec mise en service.', 800, 2000, 'TTC_forfait', 180, 360, false, 730, 7),
  (r_diag_elec, 'electricity', 'diagnostic-electrique', 'Diagnostic électrique', 'Contrôle conformité NF C 15-100, rapport détaillé.', 150, 300, 'TTC_forfait', 120, 240, false, NULL, 8);

  -- LOCKSMITH
  INSERT INTO questionnaire_resultats (id, domaine_code, slug, nom, description, prix_min, prix_max, unite_prix, duree_min_minutes, duree_max_minutes, urgence_disponible, garantie_jours, display_order) VALUES
  (r_ouv_claquee_std, 'locksmith', 'ouverture-claquee-standard', 'Ouverture porte claquée — standard', 'Ouverture sans dommage par crochetage ou carte.', 130, 150, 'TTC_forfait', 15, 30, true, NULL, 1),
  (r_ouv_claquee_blindee, 'locksmith', 'ouverture-claquee-blindee', 'Ouverture porte blindée claquée', 'Technique non destructive adaptée aux portes renforcées.', 150, 200, 'TTC_forfait', 30, 60, true, NULL, 2),
  (r_ouv_verrou_std, 'locksmith', 'ouverture-verrouille-standard', 'Ouverture porte verrouillée — standard', 'Crochetage ou cylindre sacrifié selon serrure.', 150, 220, 'TTC_forfait', 30, 60, true, NULL, 3),
  (r_ouv_verrou_blindee, 'locksmith', 'ouverture-verrouille-blindee', 'Ouverture porte blindée verrouillée', 'Intervention longue sur serrure multipoints.', 200, 350, 'TTC_forfait', 60, 120, true, NULL, 4),
  (r_ouv_cambrio, 'locksmith', 'ouverture-cambriolage', 'Ouverture + sécurisation urgence', 'Ouverture immédiate + condamnation provisoire de la porte.', 200, 400, 'TTC_forfait', 30, 90, true, NULL, 5),
  (r_chg_cylindre, 'locksmith', 'changement-cylindre', 'Changement de cylindre', 'Dépose ancien cylindre + pose cylindre A2P selon niveau de sécurité.', 120, 200, 'TTC_forfait', 30, 60, true, 365, 6),
  (r_serrure_3pts, 'locksmith', 'serrure-3-points', 'Serrure 3 points', 'Dépose + pose serrure 3 points avec cylindre inclus.', 400, 600, 'TTC_forfait', 60, 120, false, 730, 7),
  (r_serrure_5pts, 'locksmith', 'serrure-5-points', 'Serrure 5 points haute sécurité', 'Serrure multipoints avec certification A2P BP.', 600, 1000, 'TTC_forfait', 120, 180, false, 730, 8),
  (r_blindage_exist, 'locksmith', 'blindage-existante', 'Blindage porte existante', 'Pose de plaques acier sur porte existante + serrure renforcée.', 500, 900, 'TTC_forfait', 180, 360, false, 730, 9),
  (r_porte_blindee, 'locksmith', 'porte-blindee', 'Porte blindée A2P BP', 'Remplacement complet par porte certifiée A2P.', 1000, 3500, 'TTC_forfait', 480, 480, false, 730, 10),
  (r_serrure_bal, 'locksmith', 'serrure-bal', 'Serrure boîte aux lettres', 'Remplacement serrure ou cylindre BAL normalisé.', 70, 150, 'TTC_forfait', 30, 30, true, 365, 11),
  (r_serrure_portail, 'locksmith', 'serrure-portail', 'Serrure portail / garage', 'Remplacement serrure ou motorisation portail/porte de garage.', 150, 350, 'TTC_forfait', 60, 120, false, 365, 12);

  -- GLAZING
  INSERT INTO questionnaire_resultats (id, domaine_code, slug, nom, description, prix_min, prix_max, unite_prix, duree_min_minutes, duree_max_minutes, urgence_disponible, garantie_jours, display_order) VALUES
  (r_vitre_simple, 'glazing', 'vitre-simple', 'Remplacement vitre simple', 'Dépose bris + coupe et pose verre simple.', 65, 200, 'TTC_m2', 60, 120, true, 365, 1),
  (r_fen_pvc, 'glazing', 'fenetre-pvc', 'Fenêtre double vitrage PVC', 'Remplacement fenêtre PVC double vitrage 4/16/4.', 350, 600, 'TTC_forfait', 120, 240, false, 730, 2),
  (r_fen_alu, 'glazing', 'fenetre-alu', 'Fenêtre double vitrage ALU', 'Remplacement fenêtre aluminium double vitrage avec RPT.', 500, 800, 'TTC_forfait', 120, 240, false, 730, 3),
  (r_fen_bois, 'glazing', 'fenetre-bois', 'Fenêtre double vitrage Bois', 'Remplacement fenêtre bois lasurée ou peinte.', 500, 900, 'TTC_forfait', 120, 240, false, 730, 4),
  (r_velux, 'glazing', 'velux', 'Remplacement Velux / fenêtre toit', 'Dépose + pose fenêtre de toit avec raccord étanchéité.', 600, 1200, 'TTC_forfait', 180, 300, false, 730, 5),
  (r_cremone, 'glazing', 'cremone', 'Remplacement crémone', 'Dépose ancienne crémone + pose crémone compatible.', 80, 150, 'TTC_forfait', 30, 60, false, 365, 6),
  (r_poignee, 'glazing', 'poignee-fenetre', 'Remplacement poignée fenêtre', 'Remplacement poignée avec ou sans cylindre de sécurité.', 60, 120, 'TTC_forfait', 30, 30, false, 365, 7),
  (r_rabotage, 'glazing', 'rabotage-fenetre', 'Rabotage / réglage fenêtre', 'Réglage des paumelles, rabotage ou ajustement des joints.', 80, 150, 'TTC_forfait', 30, 90, false, 365, 8),
  (r_joints_fenetre, 'glazing', 'joints-fenetre', 'Remplacement joints fenêtre', 'Dépose anciens joints + pose joints EPDM ou silicone.', 50, 150, 'TTC_forfait', 30, 90, false, 730, 9);

  -- HEATING
  INSERT INTO questionnaire_resultats (id, domaine_code, slug, nom, description, prix_min, prix_max, unite_prix, duree_min_minutes, duree_max_minutes, urgence_disponible, garantie_jours, display_order) VALUES
  (r_depannage_gaz, 'heating', 'depannage-chaudiere-gaz', 'Dépannage chaudière gaz', 'Diagnostic + réparation selon pièce défaillante.', 150, 500, 'TTC_forfait', 60, 180, true, 365, 1),
  (r_entretien_gaz, 'heating', 'entretien-chaudiere-gaz', 'Entretien chaudière gaz', 'Contrôle, nettoyage, réglage combustion + attestation.', 150, 180, 'TTC_forfait', 60, 90, false, NULL, 2),
  (r_rempl_chaud_std, 'heating', 'remplacement-chaudiere-standard', 'Remplacement chaudière gaz standard', 'Dépose ancienne chaudière + fourniture et pose.', 2000, 3500, 'TTC_forfait', 480, 480, false, 730, 3),
  (r_rempl_chaud_cond, 'heating', 'remplacement-chaudiere-condensation', 'Remplacement chaudière condensation', 'Chaudière à condensation rendement >100% PCI.', 2500, 5000, 'TTC_forfait', 480, 480, false, 730, 4),
  (r_purge_rad, 'heating', 'purge-radiateurs', 'Purge radiateurs + équilibrage circuit', 'Purge de l''air emprisonné dans les radiateurs et équilibrage.', 80, 400, 'TTC_forfait', 60, 240, false, 365, 5),
  (r_robinet_thermo, 'heating', 'robinet-thermostatique', 'Remplacement robinet thermostatique', 'Dépose ancien robinet + pose robinet thermostatique.', 100, 200, 'TTC_forfait', 30, 60, false, 365, 6),
  (r_pose_rad, 'heating', 'pose-radiateur', 'Pose radiateur chauffage central', 'Raccordement + pose radiateur sur circuit existant.', 250, 400, 'TTC_forfait', 120, 240, false, 730, 7),
  (r_entretien_fioul, 'heating', 'entretien-chaudiere-fioul', 'Entretien chaudière fioul', 'Contrôle, nettoyage brûleur et échangeur, ramonage + attestation.', 150, 200, 'TTC_forfait', 90, 120, false, NULL, 8),
  (r_repar_fioul, 'heating', 'reparation-chaudiere-fioul', 'Réparation chaudière fioul', 'Diagnostic + réparation brûleur, pompe à fioul ou carte.', 200, 600, 'TTC_forfait', 60, 180, false, 365, 9);

  -- AIRCON
  INSERT INTO questionnaire_resultats (id, domaine_code, slug, nom, description, prix_min, prix_max, unite_prix, duree_min_minutes, duree_max_minutes, urgence_disponible, garantie_jours, display_order) VALUES
  (r_clim_mono, 'aircon', 'clim-monosplit', 'Installation clim monosplit', 'Fourniture + pose 1 unité intérieure + 1 unité extérieure.', 1200, 2500, 'TTC_forfait', 240, 360, false, 730, 1),
  (r_clim_bi, 'aircon', 'clim-bisplit', 'Installation clim bisplit', '1 groupe extérieur + 2 unités intérieures.', 2000, 3500, 'TTC_forfait', 360, 480, false, 730, 2),
  (r_clim_multi, 'aircon', 'clim-multisplit', 'Installation clim multisplit', '1 groupe extérieur + 3 unités intérieures ou plus.', 2800, 5000, 'TTC_forfait', 480, 960, false, 730, 3),
  (r_entretien_clim, 'aircon', 'entretien-clim', 'Entretien climatisation', 'Nettoyage filtres, unités intérieure et extérieure, contrôle fluide.', 150, 400, 'TTC_forfait', 60, 120, false, 365, 4),
  (r_depannage_clim, 'aircon', 'depannage-clim', 'Dépannage clim — perte de puissance', 'Diagnostic fuite gaz, compresseur ou carte électronique.', 200, 800, 'TTC_forfait', 60, 180, true, 365, 5),
  (r_fuite_eau_clim, 'aircon', 'fuite-eau-clim', 'Fuite eau unité intérieure', 'Nettoyage bac + tuyau de condensats bouché.', 150, 300, 'TTC_forfait', 60, 120, true, 365, 6),
  (r_bruit_clim, 'aircon', 'bruit-clim', 'Diagnostic bruit clim', 'Contrôle fixations, ventilateur et compresseur.', 150, 300, 'TTC_forfait', 60, 120, false, 365, 7),
  (r_pac_air_air, 'aircon', 'pac-air-air', 'Installation PAC air/air', 'Pompe à chaleur avec distribution par soufflage d''air.', 2500, 8000, 'TTC_forfait', 480, 960, false, 730, 8),
  (r_pac_air_eau, 'aircon', 'pac-air-eau', 'Installation PAC air/eau', 'PAC avec distribution via radiateurs ou plancher chauffant.', 7000, 15000, 'TTC_forfait', 960, 1440, false, 730, 9),
  (r_entretien_pac, 'aircon', 'entretien-pac', 'Entretien & dépannage PAC', 'Entretien annuel ou réparation pompe à chaleur.', 150, 600, 'TTC_forfait', 60, 180, false, 365, 10);

  -- ========== QUESTIONS ==========
  INSERT INTO questionnaire_questions (id, domaine_code, libelle, sous_libelle, est_racine, display_order) VALUES
  (q_plumb_root, 'plumbing', 'Où se situe votre problème ?', 'Indiquez la zone concernée dans votre logement', true, 1),
  (q_plumb_wc, 'plumbing', 'Dans quel domaine avez-vous besoin d''aide ?', NULL, false, 1),
  (q_plumb_wc_rempl, 'plumbing', 'Quel type de WC souhaitez-vous ?', NULL, false, 1),
  (q_plumb_evier, 'plumbing', 'Quel est le problème ?', NULL, false, 2),
  (q_plumb_douche, 'plumbing', 'Quel est le problème ?', NULL, false, 3),
  (q_plumb_chauffe, 'plumbing', 'Quel est votre type de chauffe-eau ?', NULL, false, 4),
  (q_plumb_chauffe_elec, 'plumbing', 'Quel est le problème ?', NULL, false, 4),
  (q_plumb_canal, 'plumbing', 'De quel type de fuite s''agit-il ?', NULL, false, 5),
  (q_elec_root, 'electricity', 'Quel est le problème électrique ?', 'Décrivez la panne ou l''installation souhaitée', true, 2),
  (q_elec_panne, 'electricity', 'Que se passe-t-il exactement ?', NULL, false, 1),
  (q_elec_panne_disj, 'electricity', 'Quelle est la situation ?', NULL, false, 1),
  (q_elec_install, 'electricity', 'Que souhaitez-vous installer ?', NULL, false, 2),
  (q_lock_root, 'locksmith', 'Quel est votre besoin en serrurerie ?', 'Urgence ou sécurisation', true, 3),
  (q_lock_bloque, 'locksmith', 'Décrivez votre porte', NULL, false, 1),
  (q_lock_claquee, 'locksmith', 'Quel type de porte ?', NULL, false, 1),
  (q_lock_verrouillee, 'locksmith', 'Quel type de porte ?', NULL, false, 2),
  (q_lock_changer, 'locksmith', 'Que souhaitez-vous changer ?', NULL, false, 2),
  (q_lock_multipoints, 'locksmith', 'Quel niveau de sécurité ?', NULL, false, 2),
  (q_lock_blindage, 'locksmith', 'Type de blindage souhaité ?', NULL, false, 2),
  (q_lock_autre, 'locksmith', 'Quel équipement ?', NULL, false, 3),
  (q_glaz_root, 'glazing', 'Quel est votre besoin en vitrerie ?', 'Bris, remplacement ou étanchéité', true, 4),
  (q_glaz_cassee, 'glazing', 'Quel type de vitrage faut-il remplacer ?', NULL, false, 1),
  (q_glaz_dv, 'glazing', 'Quel matériau de menuiserie ?', NULL, false, 1),
  (q_glaz_meca, 'glazing', 'Quel mécanisme est défaillant ?', NULL, false, 2),
  (q_glaz_etanch, 'glazing', 'Où est le problème d''étanchéité ?', NULL, false, 3),
  (q_heat_root, 'heating', 'Quel est votre système de chauffage ?', 'Identifiez votre équipement', true, 5),
  (q_heat_gaz, 'heating', 'Quel est le problème ?', NULL, false, 1),
  (q_heat_gaz_rempl, 'heating', 'Quel type de chaudière souhaitez-vous ?', NULL, false, 1),
  (q_heat_rad, 'heating', 'Quel est le problème avec vos radiateurs ?', NULL, false, 2),
  (q_heat_fioul, 'heating', 'Quel est le problème ?', NULL, false, 3),
  (q_air_root, 'aircon', 'Quel est votre équipement ?', 'Climatisation ou pompe à chaleur', true, 6),
  (q_air_clim, 'aircon', 'Que souhaitez-vous ?', NULL, false, 1),
  (q_air_install, 'aircon', 'Combien de pièces à climatiser ?', NULL, false, 1),
  (q_air_panne, 'aircon', 'Quel symptôme observez-vous ?', NULL, false, 1),
  (q_air_pac, 'aircon', 'Quel type de PAC ?', NULL, false, 2);

  -- ========== REPONSES ==========
  -- PLUMBING root
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_plumb_root, q_plumb_wc, NULL, 'WC', '🚽', 1),
  (q_plumb_root, q_plumb_evier, NULL, 'Évier / lavabo', '🚿', 2),
  (q_plumb_root, q_plumb_douche, NULL, 'Douche / baignoire', '🛁', 3),
  (q_plumb_root, q_plumb_chauffe, NULL, 'Chauffe-eau', '♨️', 4),
  (q_plumb_root, q_plumb_canal, NULL, 'Canalisation', '🔧', 5);
  -- WC
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_plumb_wc, NULL, r_debouchage_wc, 'Engorgement / bouchon', '💩', 1),
  (q_plumb_wc, NULL, r_fuite_wc, 'Fuite au sol', '💧', 2),
  (q_plumb_wc, NULL, r_chasse, 'Chasse défaillante', '🔄', 3),
  (q_plumb_wc, q_plumb_wc_rempl, NULL, 'Remplacement WC', '🔩', 4);
  -- WC remplacement
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_plumb_wc_rempl, NULL, r_pose_wc_std, 'WC standard à poser', '🚽', 1),
  (q_plumb_wc_rempl, NULL, r_pose_wc_susp, 'WC suspendu', '🪣', 2),
  (q_plumb_wc_rempl, NULL, r_sanibroyeur, 'Sanibroyeur', '⚙️', 3);
  -- Évier
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_plumb_evier, NULL, r_debouchage_evier, 'Bouchon / eau stagnante', '🚫', 1),
  (q_plumb_evier, NULL, r_fuite_canal_app, 'Fuite sous le meuble', '💧', 2),
  (q_plumb_evier, NULL, r_changement_robinet, 'Robinet à changer', '🔧', 3);
  -- Douche / baignoire (avec joints douche déplacé ici)
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_plumb_douche, NULL, r_debouchage_douche, 'Évacuation bouchée', '🚫', 1),
  (q_plumb_douche, NULL, r_changement_robinet_douche, 'Fuite robinet / mitigeur', '💧', 2),
  (q_plumb_douche, NULL, r_joints_douche, 'Étanchéité / joints', '🚿', 3);
  -- Chauffe-eau
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_plumb_chauffe, q_plumb_chauffe_elec, NULL, 'Électrique', '⚡', 1),
  (q_plumb_chauffe, NULL, r_ce_gaz, 'Gaz', '🔥', 2);
  -- Chauffe-eau électrique
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_plumb_chauffe_elec, NULL, r_fuite_ce_elec, 'Fuite visible', '💧', 1),
  (q_plumb_chauffe_elec, NULL, r_repar_ballon, 'Plus d''eau chaude', '🌡️', 2),
  (q_plumb_chauffe_elec, NULL, r_rempl_ballon, 'Remplacement complet', '🔄', 3);
  -- Canalisation
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_plumb_canal, NULL, r_fuite_canal_app, 'Fuite visible / apparente', '💧', 1),
  (q_plumb_canal, NULL, r_fuite_canal_enc, 'Fuite encastrée / mur', '🏗️', 2),
  (q_plumb_canal, NULL, r_debouchage_colonne, 'Colonne d''immeuble', '🏢', 3);

  -- ELECTRICITY root
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_elec_root, q_elec_panne, NULL, 'Panne électrique', '🔌', 1),
  (q_elec_root, q_elec_install, NULL, 'Installation / équipement', '🔧', 2);
  -- Panne
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_elec_panne, q_elec_panne_disj, NULL, 'Disjoncteur qui saute', '⚡', 1),
  (q_elec_panne, NULL, r_panne_prises, 'Prises / zone sans courant', '🔌', 2),
  (q_elec_panne, NULL, r_depannage_eclairage, 'Plus de lumière', '💡', 3);
  -- Disjoncteur
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_elec_panne_disj, NULL, r_rempl_disj, 'Disjoncteur différentiel seul', '🔘', 1),
  (q_elec_panne_disj, NULL, r_rempl_tableau, 'Tableau complet obsolète', '🗃️', 2);
  -- Installation
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_elec_install, NULL, r_pose_prise, 'Prise ou interrupteur', '🔌', 1),
  (q_elec_install, NULL, r_pose_luminaire, 'Point lumineux', '💡', 2),
  (q_elec_install, NULL, r_borne_irve, 'Borne recharge VE', '🚗', 3),
  (q_elec_install, NULL, r_diag_elec, 'Diagnostic installation', '📋', 4);

  -- LOCKSMITH root
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_lock_root, q_lock_bloque, NULL, 'Je suis bloqué dehors', '🚪', 1),
  (q_lock_root, q_lock_changer, NULL, 'Changer / renforcer la serrure', '🔧', 2),
  (q_lock_root, q_lock_autre, NULL, 'Autre serrurerie', '🔩', 3);
  -- Bloqué
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_lock_bloque, q_lock_claquee, NULL, 'Porte claquée (clé à l''intérieur)', '😰', 1),
  (q_lock_bloque, q_lock_verrouillee, NULL, 'Porte verrouillée (clé perdue)', '🔐', 2),
  (q_lock_bloque, NULL, r_ouv_cambrio, 'Suite à cambriolage', '🚨', 3);
  -- Claquée
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_lock_claquee, NULL, r_ouv_claquee_std, 'Porte standard', '🚪', 1),
  (q_lock_claquee, NULL, r_ouv_claquee_blindee, 'Porte blindée / 3 points', '🛡️', 2);
  -- Verrouillée
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_lock_verrouillee, NULL, r_ouv_verrou_std, 'Porte standard', '🚪', 1),
  (q_lock_verrouillee, NULL, r_ouv_verrou_blindee, 'Porte blindée', '🛡️', 2);
  -- Changer
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_lock_changer, NULL, r_chg_cylindre, 'Cylindre seul', '🔩', 1),
  (q_lock_changer, q_lock_multipoints, NULL, 'Serrure multipoints', '🔐', 2),
  (q_lock_changer, q_lock_blindage, NULL, 'Blindage de porte', '🛡️', 3);
  -- Multipoints
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_lock_multipoints, NULL, r_serrure_3pts, 'Serrure 3 points standard', '🔒', 1),
  (q_lock_multipoints, NULL, r_serrure_5pts, 'Serrure 5 points A2P', '🛡️', 2);
  -- Blindage
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_lock_blindage, NULL, r_blindage_exist, 'Blindage porte existante', '🔨', 1),
  (q_lock_blindage, NULL, r_porte_blindee, 'Porte blindée complète', '🚪', 2);
  -- Autre
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_lock_autre, NULL, r_serrure_bal, 'Boîte aux lettres', '📬', 1),
  (q_lock_autre, NULL, r_serrure_portail, 'Portail / garage', '🏠', 2);

  -- GLAZING root
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_glaz_root, q_glaz_cassee, NULL, 'Vitre cassée / fissurée', '💥', 1),
  (q_glaz_root, q_glaz_meca, NULL, 'Mécanisme fenêtre défaillant', '🔧', 2),
  (q_glaz_root, q_glaz_etanch, NULL, 'Problème d''étanchéité', '💧', 3);
  -- Cassée
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_glaz_cassee, NULL, r_vitre_simple, 'Vitrage simple (1 seule paroi)', '🪟', 1),
  (q_glaz_cassee, q_glaz_dv, NULL, 'Double vitrage (fenêtre)', '🏠', 2),
  (q_glaz_cassee, NULL, r_velux, 'Velux / fenêtre de toit', '🏔️', 3);
  -- Double vitrage
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_glaz_dv, NULL, r_fen_pvc, 'PVC', '🟦', 1),
  (q_glaz_dv, NULL, r_fen_alu, 'Aluminium', '⬜', 2),
  (q_glaz_dv, NULL, r_fen_bois, 'Bois', '🪵', 3);
  -- Mécanisme
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_glaz_meca, NULL, r_cremone, 'Crémone', '🔩', 1),
  (q_glaz_meca, NULL, r_poignee, 'Poignée cassée', '✋', 2),
  (q_glaz_meca, NULL, r_rabotage, 'Fenêtre qui frotte / coince', '😤', 3);
  -- Étanchéité (joints douche retiré, déplacé vers plumbing)
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_glaz_etanch, NULL, r_joints_fenetre, 'Joints fenêtre / porte-fenêtre', '🪟', 1);

  -- HEATING root
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_heat_root, q_heat_gaz, NULL, 'Chaudière gaz', '🔥', 1),
  (q_heat_root, q_heat_rad, NULL, 'Radiateurs', '♨️', 2),
  (q_heat_root, q_heat_fioul, NULL, 'Chaudière fioul', '🛢️', 3);
  -- Gaz
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_heat_gaz, NULL, r_depannage_gaz, 'Plus de chauffage / eau chaude', '❄️', 1),
  (q_heat_gaz, NULL, r_entretien_gaz, 'Entretien annuel obligatoire', '📋', 2),
  (q_heat_gaz, q_heat_gaz_rempl, NULL, 'Remplacement chaudière', '🔄', 3);
  -- Remplacement chaudière
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_heat_gaz_rempl, NULL, r_rempl_chaud_std, 'Murale standard', '📦', 1),
  (q_heat_gaz_rempl, NULL, r_rempl_chaud_cond, 'Condensation (économique)', '💧', 2);
  -- Radiateurs
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_heat_rad, NULL, r_purge_rad, 'Radiateur froid / peu chaud', '❄️', 1),
  (q_heat_rad, NULL, r_robinet_thermo, 'Robinet thermostatique HS', '🔧', 2),
  (q_heat_rad, NULL, r_pose_rad, 'Pose d''un nouveau radiateur', '➕', 3);
  -- Fioul
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_heat_fioul, NULL, r_entretien_fioul, 'Entretien annuel', '📋', 1),
  (q_heat_fioul, NULL, r_repar_fioul, 'Panne', '❌', 2);

  -- AIRCON root
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_air_root, q_air_clim, NULL, 'Climatisation', '❄️', 1),
  (q_air_root, q_air_pac, NULL, 'Pompe à chaleur (PAC)', '🌡️', 2);
  -- Clim
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_air_clim, q_air_install, NULL, 'Installation nouvelle clim', '🔧', 1),
  (q_air_clim, NULL, r_entretien_clim, 'Entretien / maintenance', '🧹', 2),
  (q_air_clim, q_air_panne, NULL, 'Panne / dépannage', '🚨', 3);
  -- Installation clim
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_air_install, NULL, r_clim_mono, '1 pièce (monosplit)', '1️⃣', 1),
  (q_air_install, NULL, r_clim_bi, '2 pièces (bisplit)', '2️⃣', 2),
  (q_air_install, NULL, r_clim_multi, '3 pièces et plus', '3️⃣', 3);
  -- Panne clim
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_air_panne, NULL, r_depannage_clim, 'Ne refroidit / ne chauffe plus', '🌡️', 1),
  (q_air_panne, NULL, r_fuite_eau_clim, 'Fuite d''eau unité intérieure', '💧', 2),
  (q_air_panne, NULL, r_bruit_clim, 'Bruit anormal', '📢', 3);
  -- PAC
  INSERT INTO questionnaire_reponses (question_id, next_question_id, resultat_id, label, icone, display_order) VALUES
  (q_air_pac, NULL, r_pac_air_air, 'PAC air/air (soufflage)', '💨', 1),
  (q_air_pac, NULL, r_pac_air_eau, 'PAC air/eau (radiateurs)', '♨️', 2),
  (q_air_pac, NULL, r_entretien_pac, 'Entretien / dépannage PAC', '🔧', 3);

  -- ========== VARIANTES ==========
  -- Debouchage WC
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_debouchage_wc, 'WC standard (furet)', 100, 150, 1),
  (r_debouchage_wc, 'WC sanibroyeur', 130, 200, 2),
  (r_debouchage_wc, 'Haute pression', 300, 500, 3);
  -- Fuite WC
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_fuite_wc, 'Joint simple', 80, 100, 1),
  (r_fuite_wc, 'Flexible + joint', 100, 150, 2);
  -- Chasse
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_chasse, 'Remplacement clapet/flotteur', 80, 120, 1),
  (r_chasse, 'Mécanisme complet', 100, 150, 2);
  -- Pose WC std
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_pose_wc_std, 'Main d''œuvre seule', 100, 150, 1),
  (r_pose_wc_std, 'Fourniture + pose', 150, 300, 2);
  -- Pose WC suspendu
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_pose_wc_susp, 'Bâti + cuvette entrée de gamme', 200, 300, 1),
  (r_pose_wc_susp, 'Bâti + cuvette haut de gamme', 300, 400, 2);
  -- Sanibroyeur
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_sanibroyeur, 'Sanibroyeur standard', 900, 1000, 1),
  (r_sanibroyeur, 'Sanibroyeur silencieux', 1000, 1100, 2);
  -- Debouchage évier
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_debouchage_evier, 'Furet manuel', 100, 130, 1),
  (r_debouchage_evier, 'Haute pression', 130, 180, 2);
  -- Fuite canal app
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_fuite_canal_app, 'Siphon + joints', 80, 120, 1),
  (r_fuite_canal_app, 'Remplacement section tuyau', 120, 200, 2);
  -- Changement robinet
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_changement_robinet, 'Robinet simple', 80, 120, 1),
  (r_changement_robinet, 'Mitigeur standard', 100, 150, 2),
  (r_changement_robinet, 'Mitigeur thermostatique', 150, 200, 3);
  -- Debouchage douche
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_debouchage_douche, 'Siphon + furet', 100, 140, 1),
  (r_debouchage_douche, 'Haute pression', 140, 180, 2);
  -- Changement robinet douche
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_changement_robinet_douche, 'Mitigeur douche standard', 100, 150, 1),
  (r_changement_robinet_douche, 'Mitigeur thermostatique', 150, 200, 2);
  -- Joints douche
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_joints_douche, 'Douche (4 côtés)', 80, 120, 1),
  (r_joints_douche, 'Baignoire complète', 100, 150, 2);
  -- Fuite CE elec
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_fuite_ce_elec, 'Groupe sécurité + joint', 100, 150, 1),
  (r_fuite_ce_elec, 'Anode + vérification', 120, 180, 2),
  (r_fuite_ce_elec, 'Remplacement si nécessaire', 350, 1000, 3);
  -- Répar ballon
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_repar_ballon, 'Remplacement résistance', 100, 160, 1),
  (r_repar_ballon, 'Thermostat défaillant', 100, 150, 2),
  (r_repar_ballon, 'Remplacement ballon 80L', 400, 600, 3);
  -- Rempl ballon
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_rempl_ballon, '50 L (studio)', 350, 500, 1),
  (r_rempl_ballon, '80 L (T2/T3)', 400, 600, 2),
  (r_rempl_ballon, '150–200 L (maison)', 600, 1000, 3),
  (r_rempl_ballon, 'Thermodynamique', 800, 1500, 4);
  -- CE gaz
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_ce_gaz, 'Réparation pièce', 150, 250, 1),
  (r_ce_gaz, 'Remplacement veilleuse/thermocouple', 100, 200, 2),
  (r_ce_gaz, 'Remplacement complet', 500, 1000, 3);
  -- Fuite canal enc
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_fuite_canal_enc, 'Recherche électronique seule', 150, 300, 1),
  (r_fuite_canal_enc, 'Recherche + réparation', 500, 800, 2),
  (r_fuite_canal_enc, 'Réfection carrelage incluse', 700, 1000, 3);
  -- Debouchage colonne
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_debouchage_colonne, 'Hydrocurage standard', 700, 800, 1),
  (r_debouchage_colonne, 'Hydrocurage + inspection caméra', 800, 900, 2);
  -- ELECTRICITY variantes
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_rempl_disj, 'Diagnostic + réarmement', 80, 120, 1),
  (r_rempl_disj, 'Remplacement différentiel 25A', 150, 220, 2),
  (r_rempl_disj, 'Remplacement différentiel 40A+', 200, 300, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_rempl_tableau, 'Studio / T1 (4–6 circuits)', 800, 1200, 1),
  (r_rempl_tableau, 'T2/T3 (6–10 circuits)', 1200, 1800, 2),
  (r_rempl_tableau, 'T4 / maison (10+ circuits)', 1800, 2500, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_panne_prises, 'Diagnostic + réarmement', 80, 120, 1),
  (r_panne_prises, 'Réparation fusible/disjoncteur', 150, 200, 2),
  (r_panne_prises, 'Remplacement câble section', 200, 300, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_depannage_eclairage, 'Remplacement interrupteur', 80, 130, 1),
  (r_depannage_eclairage, 'Réparation circuit complet', 150, 250, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_pose_prise, 'Prise simple 16A', 80, 100, 1),
  (r_pose_prise, 'Prise 2P+T 20A', 100, 130, 2),
  (r_pose_prise, 'Interrupteur double', 100, 150, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_pose_luminaire, 'Pose lustre/plafonnier', 80, 130, 1),
  (r_pose_luminaire, 'Kit 3 spots encastrés', 150, 250, 2),
  (r_pose_luminaire, 'Kit 6 spots + variateur', 200, 300, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_borne_irve, 'Wallbox 7 kW (mono)', 800, 1200, 1),
  (r_borne_irve, 'Wallbox 11 kW (tri)', 1000, 1500, 2),
  (r_borne_irve, 'Borne avec délestage', 1400, 2000, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_diag_elec, 'Appartement < 60 m²', 150, 200, 1),
  (r_diag_elec, 'Appartement 60–100 m²', 180, 250, 2),
  (r_diag_elec, 'Maison > 100 m²', 250, 300, 3);
  -- LOCKSMITH variantes
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_ouv_claquee_std, 'Ouverture simple', 130, 150, 1);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_ouv_claquee_blindee, 'Blindage standard', 150, 175, 1),
  (r_ouv_claquee_blindee, 'Blindage haute sécurité', 175, 200, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_ouv_verrou_std, 'Ouverture sans casse', 150, 180, 1),
  (r_ouv_verrou_std, 'Avec remplacement cylindre', 180, 220, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_ouv_verrou_blindee, '3 points', 200, 280, 1),
  (r_ouv_verrou_blindee, '5 points A2P', 280, 350, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_ouv_cambrio, 'Ouverture + condamnation', 200, 300, 1),
  (r_ouv_cambrio, '+ Remplacement serrure urgence', 300, 400, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_chg_cylindre, 'Cylindre standard', 120, 150, 1),
  (r_chg_cylindre, 'Cylindre A2P 1★', 150, 180, 2),
  (r_chg_cylindre, 'Cylindre A2P 2★', 180, 200, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_serrure_3pts, 'Entrée de gamme', 400, 500, 1),
  (r_serrure_3pts, 'Avec cylindre A2P', 500, 600, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_serrure_5pts, '5 pts A2P BP1', 600, 750, 1),
  (r_serrure_5pts, '5 pts A2P BP2', 750, 900, 2),
  (r_serrure_5pts, '5 pts A2P BP3', 900, 1000, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_blindage_exist, 'Blindage simple acier', 500, 700, 1),
  (r_blindage_exist, 'Blindage + pivot + 5pts', 700, 900, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_porte_blindee, 'A2P 1★ BP1', 1000, 1500, 1),
  (r_porte_blindee, 'A2P 2★ BP2', 1200, 1800, 2),
  (r_porte_blindee, 'A2P 3★ BP3', 1500, 3500, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_serrure_bal, 'Serrure standard', 70, 100, 1),
  (r_serrure_bal, 'Cylindre sécurisé', 100, 150, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_serrure_portail, 'Serrure portail simple', 150, 200, 1),
  (r_serrure_portail, 'Motorisation portail', 250, 350, 2);
  -- GLAZING variantes
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_vitre_simple, 'Simple clair', 65, 100, 1),
  (r_vitre_simple, 'Feuilleté sécurité', 150, 280, 2),
  (r_vitre_simple, 'Anti-effraction', 200, 350, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_fen_pvc, '60×90 cm', 350, 450, 1),
  (r_fen_pvc, '90×120 cm', 450, 550, 2),
  (r_fen_pvc, '120×140 cm', 500, 600, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_fen_alu, 'Standard', 500, 650, 1),
  (r_fen_alu, 'RPT haute performance', 650, 800, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_fen_bois, 'Bois pin', 500, 700, 1),
  (r_fen_bois, 'Bois chêne / exotique', 700, 900, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_velux, 'Simple vitrage', 600, 800, 1),
  (r_velux, 'Double vitrage', 800, 1000, 2),
  (r_velux, 'Triple vitrage', 1000, 1200, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_cremone, 'Crémone standard', 80, 120, 1),
  (r_cremone, 'Crémone multipoints', 120, 150, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_poignee, 'Poignée standard', 60, 80, 1),
  (r_poignee, 'Poignée avec clé', 80, 120, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_rabotage, 'Réglage charnières', 80, 100, 1),
  (r_rabotage, 'Rabotage bois', 100, 150, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_joints_fenetre, 'Joints 1 fenêtre', 50, 80, 1),
  (r_joints_fenetre, 'Joints 3 fenêtres', 100, 150, 2);
  -- HEATING variantes
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_depannage_gaz, 'Carte électronique', 200, 500, 1),
  (r_depannage_gaz, 'Brûleur / vanne gaz', 150, 350, 2),
  (r_depannage_gaz, 'Circulateur', 150, 300, 3),
  (r_depannage_gaz, 'Sonde / thermocouple', 100, 250, 4);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_entretien_gaz, 'Chaudière murale', 150, 170, 1),
  (r_entretien_gaz, 'Chaudière à condensation', 160, 180, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_rempl_chaud_std, '24 kW', 2000, 2800, 1),
  (r_rempl_chaud_std, '30 kW', 2500, 3500, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_rempl_chaud_cond, '24 kW', 2500, 3500, 1),
  (r_rempl_chaud_cond, '30 kW', 3000, 4500, 2),
  (r_rempl_chaud_cond, '+ régulation', 3500, 5000, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_purge_rad, 'Purge 1 radiateur', 80, 120, 1),
  (r_purge_rad, 'Purge circuit complet', 150, 300, 2),
  (r_purge_rad, 'Désembouage complet', 300, 600, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_robinet_thermo, 'Robinet standard', 100, 150, 1),
  (r_robinet_thermo, 'Tête connectée', 150, 200, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_pose_rad, 'Radiateur acier standard', 250, 350, 1),
  (r_pose_rad, 'Radiateur fonte', 300, 400, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_entretien_fioul, 'Entretien standard', 150, 180, 1),
  (r_entretien_fioul, 'Entretien + ramonage', 180, 200, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_repar_fioul, 'Brûleur', 200, 400, 1),
  (r_repar_fioul, 'Pompe à fioul', 200, 350, 2),
  (r_repar_fioul, 'Carte électronique', 300, 600, 3);
  -- AIRCON variantes
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_clim_mono, '2,5 kW — 25 m²', 1200, 1800, 1),
  (r_clim_mono, '3,5 kW — 35 m²', 1400, 2000, 2),
  (r_clim_mono, '5 kW — 50 m²', 1800, 2500, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_clim_bi, '2×2,5 kW', 2000, 2800, 1),
  (r_clim_bi, '2×3,5 kW', 2500, 3500, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_clim_multi, 'Trisplit 3×2,5 kW', 2800, 4000, 1),
  (r_clim_multi, 'Quadrisplit', 3500, 5000, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_entretien_clim, 'Monosplit (filtres + int.)', 150, 180, 1),
  (r_entretien_clim, 'Monosplit complet + ext.', 170, 220, 2),
  (r_entretien_clim, 'Bisplit', 200, 300, 3),
  (r_entretien_clim, 'Trisplit', 280, 400, 4);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_depannage_clim, 'Recharge gaz R410A/R32', 200, 400, 1),
  (r_depannage_clim, 'Compresseur HS', 300, 800, 2),
  (r_depannage_clim, 'Carte électronique', 200, 500, 3);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_fuite_eau_clim, 'Nettoyage condensats', 150, 200, 1),
  (r_fuite_eau_clim, 'Remplacement pompe relevage', 200, 300, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_bruit_clim, 'Resserrage + vibrations', 150, 180, 1),
  (r_bruit_clim, 'Remplacement ventilateur', 200, 300, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_pac_air_air, 'Monosplit petite surface', 2500, 4000, 1),
  (r_pac_air_air, 'Multisplit grande surface', 4000, 8000, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_pac_air_eau, 'Sur radiateurs', 7000, 12000, 1),
  (r_pac_air_eau, 'Sur plancher chauffant', 10000, 15000, 2);
  INSERT INTO questionnaire_variantes (resultat_id, nom, prix_min, prix_max, display_order) VALUES
  (r_entretien_pac, 'Entretien annuel PAC', 150, 250, 1),
  (r_entretien_pac, 'Dépannage panne', 200, 600, 2),
  (r_entretien_pac, 'Recharge fluide', 200, 500, 3);

END $$;


-- ============================================================
-- Migration: 20260308160001_fa4d6651-3c9e-40ad-af9c-89c2646c1597.sql
-- ============================================================

UPDATE payment_authorizations SET status = 'cancelled', cancelled_at = now() WHERE intervention_id = '65e6dc42-8237-48cd-9375-6587c757268a' AND status = 'pending'

-- ============================================================
-- Migration: 20260308161713_56edf90c-87af-42e8-b28a-c9247490384b.sql
-- ============================================================

UPDATE payment_authorizations SET status = 'cancelled', cancelled_at = now() WHERE intervention_id = '65e6dc42-8237-48cd-9375-6587c757268a' AND status = 'pending';

-- ============================================================
-- Migration: 20260308172619_51a635dd-b404-4046-8c67-89a74882ec46.sql
-- ============================================================

UPDATE public.payment_authorizations SET status = 'cancelled', cancelled_at = now() WHERE intervention_id = '65e6dc42-8237-48cd-9375-6587c757268a' AND status = 'pending'

-- ============================================================
-- Migration: 20260308222516_457ec9d6-44f2-4609-a8f1-264c15262661.sql
-- ============================================================


-- Fix the self-referential bug in the INSERT policy for intervention_ratings
DROP POLICY IF EXISTS "Clients can insert their own ratings" ON public.intervention_ratings;


-- ============================================================
-- Migration: 20260308224052_e2e82aa6-9159-4f4b-8b11-a2dd2fbcc713.sql
-- ============================================================


-- Table for email verification tokens
CREATE TABLE public.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Index for quick token lookup
CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);


-- ============================================================
-- Migration: 20260311175751_01290fde-33dd-4780-be49-83546e8a3176.sql
-- ============================================================

ALTER TABLE public.services DROP COLUMN IF EXISTS repair_price;
ALTER TABLE public.services DROP COLUMN IF EXISTS base_price;

-- ============================================================
-- Migration: 20260311180946_9047caa0-f544-4b1e-8e85-8d67b8d865f3.sql
-- ============================================================


ALTER TABLE public.disputes
ADD COLUMN IF NOT EXISTS refund_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS refund_stripe_id text DEFAULT NULL;

COMMENT ON COLUMN public.disputes.refund_type IS 'Type of refund: full, partial, or none';
COMMENT ON COLUMN public.disputes.refund_amount IS 'Refund amount in euros';
COMMENT ON COLUMN public.disputes.refund_stripe_id IS 'Stripe refund ID';


-- ============================================================
-- Migration: 20260311192150_71f2743c-e040-46b0-b493-ce80091739e5.sql
-- ============================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'payment';

-- ============================================================
-- Migration: 20260311194452_d98c6799-a5f2-4a81-bd35-199d29909184.sql
-- ============================================================


-- Notification settings: admin global config per event type and channel
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('push', 'sms', 'email')),
  is_enabled boolean NOT NULL DEFAULT true,
  applicable_roles text[] NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_type, channel)
);

-- User notification preferences: per-user overrides
CREATE TABLE public.user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('push', 'sms', 'email')),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_type, channel)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Updated_at triggers
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================
-- Migration: 20260314123712_93d0551d-0b24-4ad9-8f2e-8f4cb0a8bd41.sql
-- ============================================================

ALTER TABLE public.partner_applications ADD COLUMN kbis_url text;

-- ============================================================
-- Migration: 20260315000343_89c78d7d-9114-44af-9bf6-fb34875d852e.sql
-- ============================================================


INSERT INTO public.notification_settings (event_type, channel, is_enabled, applicable_roles, description)
VALUES
  ('technician_accepted', 'email', true, ARRAY['technician'], 'Email de félicitations lors de l''acceptation d''un technicien'),
  ('technician_rejected', 'email', true, ARRAY['technician'], 'Email de refus de candidature technicien');


-- ============================================================
-- Migration: 20260406102747_a2ce4a17-d272-44c4-9a2a-5b614fc1db60.sql
-- ============================================================

ALTER TABLE public.interventions ADD COLUMN invoice_pdf_url text DEFAULT NULL;

-- ============================================================
-- Migration: 20260412080923_4c866e14-8585-471f-9dcf-60fe6e8878a5.sql
-- ============================================================

DO $$
DECLARE
  nullable_column text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'partner_applications'
      AND column_name = 'motivation'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'partner_applications'
      AND column_name = 'presentation'
  ) THEN
    EXECUTE 'ALTER TABLE public.partner_applications RENAME COLUMN motivation TO presentation';
  END IF;

  FOREACH nullable_column IN ARRAY ARRAY[
    'vat_number',
    'legal_status',
    'address',
    'postal_code',
    'city',
    'birth_date',
    'birth_place',
    'insurance_company',
    'insurance_policy_number',
    'insurance_expiry_date',
    'presentation',
    'bank_account_holder',
    'bank_name',
    'iban',
    'bic'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'partner_applications'
        AND column_name = nullable_column
        AND is_nullable = 'NO'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.partner_applications ALTER COLUMN %I DROP NOT NULL',
        nullable_column
      );
    END IF;
  END LOOP;
END
$$;

-- ============================================================
-- Migration: 20260510034824_16eba4fa-d06b-48d8-8cf0-04b2707ba4ea.sql
-- ============================================================

ALTER TABLE public.partner_applications RENAME COLUMN siret TO siren;

-- ============================================================
-- Migration: 20260510045219_b1e016df-1c82-4516-96f2-d288f2a2744e.sql
-- ============================================================

CREATE TYPE public.partner_availability AS ENUM ('week_day', 'evening', 'week_end', 'public_holidays', 'night', 'anytime');

ALTER TABLE public.partner_applications
ADD COLUMN availability public.partner_availability[] NOT NULL DEFAULT '{}';

-- ============================================================
-- Migration: 20260510111302_5d70ab5a-1886-483a-8b48-5d7a157dee01.sql
-- ============================================================

-- Add certifications column to partner_applications table
ALTER TABLE public.partner_applications
ADD COLUMN certifications TEXT[] NOT NULL DEFAULT '{}';

-- ============================================================
-- Migration: 20260510142041_81642bb0-ce1e-49ca-9d3d-dcee461e8ab1.sql
-- ============================================================

ALTER TABLE public.partner_applications
ADD COLUMN has_vehicle BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN zone TEXT DEFAULT NULL;

-- ============================================================
-- Migration: 20260514183031_60d3e9f1-8033-428a-8213-dd30440fbc51.sql
-- ============================================================

ALTER TABLE public.interventions
ADD COLUMN invoice_signature_data TEXT,
ADD COLUMN invoice_signed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.interventions.invoice_signature_data IS 'Données de signature du client sur la facture finale (format base64/svg)';
COMMENT ON COLUMN public.interventions.invoice_signed_at IS 'Date et heure de signature de la facture par le client';

-- ============================================================
-- Migration: 20260514183756_67466ce9-fc92-4384-ad15-5cfdda2c47c6.sql
-- ============================================================

-- Modifier le type de invoice_signed_at pour retirer le timezone
ALTER TABLE public.interventions 
ALTER COLUMN invoice_signed_at TYPE timestamp without time zone;

-- ============================================================
-- Migration: 20260522105122_b05b4c95-d1e9-4e10-b55e-9aa4d27fe539.sql
-- ============================================================

CREATE TABLE public.phone_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  intervention_type text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_phone_verification_codes_phone_code
  ON public.phone_verification_codes (phone, code);
CREATE INDEX idx_phone_verification_codes_expires_at
  ON public.phone_verification_codes (expires_at);

ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Migration: 20260522120438_b679de28-e43b-4e92-b4fa-229e24e6eec0.sql
-- ============================================================

ALTER TABLE public.phone_verification_codes DROP COLUMN intervention_type;

-- Update intervention_work_photos.photo_url
UPDATE intervention_work_photos
SET photo_url = regexp_replace(
  photo_url,
  '/intervention-photos/work-photos/([^/]+)/(before|after)/',
  '/interventions/\1/work-photos/\2/'
)
WHERE photo_url LIKE '%/intervention-photos/work-photos/%';

-- Update interventions.photos array
UPDATE interventions
SET photos = ARRAY(
  SELECT
    CASE
      WHEN p LIKE '%/intervention-photos/temp/%'
        THEN replace(p, '/intervention-photos/temp/', '/interventions/temp/')
      WHEN p ~ '/intervention-photos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
        THEN regexp_replace(
          p,
          '/intervention-photos/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/([^/]+)$',
          '/interventions/\1/photos/\2'
        )
      ELSE p
    END
  FROM unnest(photos) AS p
)
WHERE EXISTS (SELECT 1 FROM unnest(photos) AS p WHERE p LIKE '%/intervention-photos/%');

-- 4. Update URLs in users table
UPDATE public.users
SET avatar_url = REPLACE(avatar_url, '/technician-photos/', '/technicians/')
WHERE avatar_url LIKE '%/technician-photos/%';

UPDATE public.users
SET company_logo_url = REPLACE(company_logo_url, '/technician-photos/', '/technicians/')
WHERE company_logo_url LIKE '%/technician-photos/%';

-- ============================================================
-- Migration: 20260603173731_c872e61d-988b-45ae-8991-ed3c006a61d7.sql
-- ============================================================

ALTER TABLE public.partner_applications RENAME COLUMN vat_number TO ape_code;

-- ============================================================
-- Migration: 20260607180329_c14a2f50-73cb-4ed4-8ded-3837a1490ba6.sql
-- ============================================================

CREATE TABLE public.action_notification_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  roles public.app_role[] NULL,
  email TEXT[] NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_notification_recipients TO authenticated;
GRANT ALL ON public.action_notification_recipients TO service_role;

ALTER TABLE public.action_notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_action_notification_recipients_updated_at
  BEFORE UPDATE ON public.action_notification_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX action_notification_recipients_action_key
  ON public.action_notification_recipients(action);

INSERT INTO public.action_notification_recipients (action, roles, email)
VALUES ('welcome-job-technician', ARRAY['manager','admin']::public.app_role[], ARRAY['k3pcontact@gmail.com']);


-- ============================================================
-- Migration: 20260615130250_695fa9d4-c880-44b7-91aa-ca085bebeb5c.sql
-- ============================================================

-- Add lock column for atomic batch processing
ALTER TABLE public.interventions 
  ADD COLUMN IF NOT EXISTS is_processing BOOLEAN NOT NULL DEFAULT FALSE;

-- Indexes to speed up scheduled-intervention queries
CREATE INDEX IF NOT EXISTS idx_interventions_scheduled_at 
  ON public.interventions(scheduled_at) 
  WHERE scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interventions_tech_scheduled 
  ON public.interventions(technician_id, scheduled_at, is_processing) 
  WHERE status IN ('new', 'assigned') AND scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interventions_scheduled_to_activate 
  ON public.interventions(scheduled_at, is_processing) 
  WHERE status = 'new' AND scheduled_at IS NOT NULL AND is_processing = FALSE;

-- Atomic CTE: lock + return scheduled interventions whose start is within next 2h
CREATE OR REPLACE FUNCTION public.lock_and_get_scheduled_interventions()
RETURNS TABLE (
  id uuid,
  title text,
  address text,
  city text,
  postal_code text,
  technician_id uuid,
  client_id uuid,
  scheduled_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH locked AS (
    UPDATE public.interventions i
    SET is_processing = TRUE
    WHERE i.status = 'new'
      AND i.scheduled_at IS NOT NULL
      AND i.scheduled_at <= (now() + interval '2 hours')
      AND i.scheduled_at > now()
      AND NOT i.is_processing
      AND i.technician_id IS NOT NULL
    RETURNING 
      i.id, i.title, i.address, i.city, i.postal_code,
      i.technician_id, i.client_id, i.scheduled_at
  )
  SELECT * FROM locked;
END;
$$;

-- ============================================================
-- TABLES HORS MIGRATIONS (créées directement en base)
-- Reconstituées depuis le schéma live le 2026-06-20
-- ============================================================

-- Table: prestation (catalogue des prestations)
CREATE TABLE IF NOT EXISTS public.prestation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  domain_code TEXT NOT NULL,
  min_price NUMERIC,
  max_price NUMERIC,
  min_duration INTEGER,
  max_duration INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  emergency_available BOOLEAN NOT NULL DEFAULT true,
  guarantee INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prestation_domain_code ON public.prestation(domain_code);
CREATE INDEX IF NOT EXISTS idx_prestation_is_active ON public.prestation(is_active);
ALTER TABLE public.prestation ENABLE ROW LEVEL SECURITY;

-- Table: prestation_variantes
CREATE TABLE IF NOT EXISTS public.prestation_variantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prestation_id UUID NOT NULL REFERENCES public.prestation(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_price NUMERIC,
  max_price NUMERIC,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prestation_variantes_pid ON public.prestation_variantes(prestation_id);
ALTER TABLE public.prestation_variantes ENABLE ROW LEVEL SECURITY;

-- Table: intervention_prestations (liaison)
CREATE TABLE IF NOT EXISTS public.intervention_prestations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  prestation_id UUID NOT NULL REFERENCES public.prestation(id) ON DELETE CASCADE,
  variante_id UUID REFERENCES public.prestation_variantes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (intervention_id, prestation_id)
);
CREATE INDEX IF NOT EXISTS idx_ip_intervention ON public.intervention_prestations(intervention_id);
CREATE INDEX IF NOT EXISTS idx_ip_prestation ON public.intervention_prestations(prestation_id);
ALTER TABLE public.intervention_prestations ENABLE ROW LEVEL SECURITY;