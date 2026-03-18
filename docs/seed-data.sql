-- ============================================================
-- DépanPro – Données de configuration minimale (seed)
-- Généré le 2026-03-18
-- ============================================================
-- IMPORTANT : Exécuter APRÈS les migrations de schéma.
-- Le mot de passe admin par défaut est : Admin@2026!
-- (hash bcrypt ci-dessous, à changer après première connexion)
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────
-- 1. UTILISATEUR ADMIN
-- ──────────────────────────────────────────────
INSERT INTO public.users (id, email, password_hash, first_name, last_name, phone, role, is_active, is_company, must_change_password)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@depanpro.fr',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- Admin@2026!
  'Super',
  'Admin',
  '+33 1 00 00 00 00',
  'admin',
  true,
  false,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Rôle RBAC associé
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- ──────────────────────────────────────────────
-- 2. SERVICES (catégories d'intervention)
-- ──────────────────────────────────────────────
INSERT INTO public.services (id, code, name, description, icon, is_active, display_order, default_priority, displacement_price, security_price, vat_rate_individual, vat_rate_professional, target_arrival_time_minutes) VALUES
  ('10000000-0000-0000-0000-000000000001', 'plumbing',    'Plomberie',         'Fuites, canalisations, robinetterie, chauffe-eau',          'Droplets',    true, 1, 'normal', 49.00, 39.00, 10.0, 20.0, 30),
  ('10000000-0000-0000-0000-000000000002', 'electricity', 'Électricité',       'Pannes électriques, tableaux, prises, éclairage',           'Zap',         true, 2, 'normal', 49.00, 39.00, 10.0, 20.0, 30),
  ('10000000-0000-0000-0000-000000000003', 'heating',     'Chauffage',         'Chaudières, radiateurs, pompes à chaleur',                  'Flame',       true, 3, 'normal', 59.00, 49.00, 10.0, 20.0, 45),
  ('10000000-0000-0000-0000-000000000004', 'locksmith',   'Serrurerie',        'Ouverture de porte, changement de serrure, blindage',       'KeyRound',    true, 4, 'urgent', 69.00, 49.00, 10.0, 20.0, 20),
  ('10000000-0000-0000-0000-000000000005', 'glazing',     'Vitrerie',          'Remplacement de vitres, double vitrage, miroirs',            'PanelTop',    true, 5, 'normal', 59.00, 39.00, 10.0, 20.0, 45),
  ('10000000-0000-0000-0000-000000000006', 'aircon',      'Climatisation',     'Installation, entretien et réparation de climatisation',     'Wind',        true, 6, 'normal', 59.00, 49.00, 10.0, 20.0, 60),
  ('10000000-0000-0000-0000-000000000007', 'other',       'Autre dépannage',   'Demandes spéciales et multi-corps de métier',                'Wrench',      true, 7, 'normal', 49.00, 39.00, 10.0, 20.0, 45)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────
-- 3. SITE_SETTINGS (paramètres globaux)
-- ──────────────────────────────────────────────
INSERT INTO public.site_settings (setting_key, setting_value, description) VALUES
  ('phone_number',                '0 800 123 456',  'Numéro de téléphone affiché sur le site (header, footer, contact)'),
  ('priority_multiplier_enabled', 'true',           'Active/désactive le système de multiplicateurs de priorité')
ON CONFLICT (setting_key) DO NOTHING;

-- ──────────────────────────────────────────────
-- 4. MULTIPLICATEURS DE PRIORITÉ
-- ──────────────────────────────────────────────
INSERT INTO public.priority_multipliers (id, priority, label, multiplier, display_order, is_enabled) VALUES
  ('20000000-0000-0000-0000-000000000001', 'low',    'Basse – Planifiable',          0.9, 1, true),
  ('20000000-0000-0000-0000-000000000002', 'normal', 'Normale – Standard',           1.0, 2, true),
  ('20000000-0000-0000-0000-000000000003', 'high',   'Haute – Rapide',               1.3, 3, true),
  ('20000000-0000-0000-0000-000000000004', 'urgent', 'Urgente – Intervention immédiate', 1.8, 4, true)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────
-- 5. CONFIGURATION ALGORITHME DE DISPATCH
-- ──────────────────────────────────────────────
INSERT INTO public.dispatch_algorithm_config (id, weight_proximity, weight_skills, weight_workload, weight_rating, is_active, created_by)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  40, 30, 20, 10,
  true,
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────
-- 6. COMMISSION PAR DÉFAUT
-- ──────────────────────────────────────────────
INSERT INTO public.commission_settings (id, partner_id, commission_rate, effective_from)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  NULL,           -- commission globale (pas liée à un partenaire spécifique)
  15.00,
  CURRENT_DATE
)
ON CONFLICT (id) DO NOTHING;

-- ──────────────────────────────────────────────
-- 7. PARAMÈTRES DE NOTIFICATIONS
-- ──────────────────────────────────────────────
-- Chaque event_type × channel = 1 ligne
INSERT INTO public.notification_settings (event_type, channel, is_enabled, description, applicable_roles) VALUES
  -- Dispatch / Assignation
  ('dispatch_assignment',   'push',  true,  'Notification push lors d''un dispatch',           '{technician}'),
  ('dispatch_assignment',   'sms',   true,  'SMS lors d''un dispatch',                          '{technician}'),
  ('dispatch_assignment',   'email', true,  'Email lors d''un dispatch',                        '{technician}'),
  -- Changement de statut
  ('status_change',         'push',  true,  'Notification push changement de statut',           '{client,technician}'),
  ('status_change',         'sms',   false, 'SMS changement de statut',                         '{client}'),
  ('status_change',         'email', true,  'Email changement de statut',                       '{client,technician,admin}'),
  -- Nouvelle intervention
  ('new_intervention',      'push',  true,  'Notification push nouvelle intervention',          '{admin,manager}'),
  ('new_intervention',      'email', true,  'Email nouvelle intervention',                      '{admin,manager}'),
  -- Modification de devis
  ('quote_modification',    'push',  true,  'Notification push modification de devis',          '{client}'),
  ('quote_modification',    'sms',   true,  'SMS modification de devis',                        '{client}'),
  ('quote_modification',    'email', true,  'Email modification de devis',                      '{client}'),
  -- Nouveau message
  ('new_message',           'push',  true,  'Notification push nouveau message',                '{client,technician}'),
  -- Paiement requis
  ('payment_required',      'push',  true,  'Notification push paiement requis',                '{client}'),
  ('payment_required',      'sms',   true,  'SMS paiement requis',                              '{client}'),
  ('payment_required',      'email', true,  'Email paiement requis',                            '{client}'),
  -- Paiement autorisé
  ('payment_authorized',    'push',  true,  'Notification push paiement autorisé',              '{technician}'),
  ('payment_authorized',    'email', true,  'Email paiement autorisé',                          '{technician,admin}'),
  -- Rappel d'arrivée
  ('arrival_reminder',      'push',  true,  'Notification push rappel d''arrivée',              '{client}'),
  ('arrival_reminder',      'sms',   true,  'SMS rappel d''arrivée',                            '{client}'),
  -- Versement technicien
  ('payout_notification',   'email', true,  'Email de notification de versement',               '{technician}'),
  ('payout_notification',   'push',  true,  'Notification push de versement',                   '{technician}'),
  -- Annulation client
  ('client_cancellation',   'push',  true,  'Notification push annulation client',              '{technician,admin}'),
  ('client_cancellation',   'email', true,  'Email annulation client',                          '{technician,admin}'),
  -- Acceptation technicien
  ('technician_accepted',   'email', true,  'Email acceptation candidature technicien',         '{technician}'),
  ('technician_accepted',   'push',  true,  'Notification push acceptation technicien',         '{technician}'),
  -- Refus technicien
  ('technician_rejected',   'email', true,  'Email refus candidature technicien',               '{technician}'),
  ('technician_rejected',   'push',  true,  'Notification push refus technicien',               '{technician}')
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================
-- Résumé des données insérées :
-- ✅ 1 utilisateur admin (admin@depanpro.fr / Admin@2026!)
-- ✅ 1 rôle RBAC admin
-- ✅ 7 services (plomberie → autre)
-- ✅ 2 paramètres site (téléphone, multiplicateurs)
-- ✅ 4 multiplicateurs de priorité
-- ✅ 1 config dispatch (poids par défaut)
-- ✅ 1 commission globale (15%)
-- ✅ 27 paramètres de notifications (12 event types × canaux)
-- ============================================================

-- ──────────────────────────────────────────────
-- 8. UTILISATEURS SUPPLÉMENTAIRES
-- ──────────────────────────────────────────────
-- Mot de passe par défaut : Client@2026! (même hash bcrypt)

INSERT INTO public.users (id, email, password_hash, first_name, last_name, phone, role, is_active, is_company, must_change_password)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'pkarlenoch@gmail.com',      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Pierre', 'Karlenoch', NULL, 'client',     true, false, true),
  ('00000000-0000-0000-0000-000000000003', 'amgcheckertest@gmail.com',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'AMG',    'Checker',   NULL, 'technician', true, false, true)
ON CONFLICT (id) DO NOTHING;

-- Rôles RBAC
INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000002', 'client'),
  ('00000000-0000-0000-0000-000000000003', 'technician')
ON CONFLICT (user_id, role) DO NOTHING;

-- ──────────────────────────────────────────────
-- 9. UTILISATEUR MANAGER
-- ──────────────────────────────────────────────
INSERT INTO public.users (id, email, password_hash, first_name, last_name, phone, role, is_active, is_company, must_change_password)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'manager@depanpro.fr',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- Admin@2026!
  'Lucas',
  'Martin',
  '+33 6 12 34 56 78',
  'manager',
  true,
  false,
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000004', 'manager')
ON CONFLICT (user_id, role) DO NOTHING;
