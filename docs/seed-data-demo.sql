-- ============================================================
-- DépanPro – Jeu de données de démo (base "fournie")
-- ============================================================
-- IMPORTANT :
--   • À exécuter APRÈS docs/seed-data.sql (configuration minimale).
--   • Idempotent : peut être ré-exécuté sans casser la base
--     (toutes les insertions utilisent ON CONFLICT DO NOTHING).
--   • Mot de passe par défaut pour TOUS les comptes créés ici :
--       Demo@2026!
--     (même hash bcrypt que dans seed-data.sql)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. UTILISATEURS DE DÉMO
-- ============================================================
-- Préfixes UUID utilisés :
--   c1xxxxxx... = clients particuliers
--   c2xxxxxx... = clients entreprises
--   t1xxxxxx... = techniciens
--   m1xxxxxx... = managers
-- ============================================================

-- ── 1.a Clients particuliers ─────────────────────────────────
INSERT INTO public.users (id, email, password_hash, first_name, last_name, phone, role, is_active, is_company, must_change_password) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'sophie.bernard@demo.fr',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Sophie',  'Bernard',  '+33 6 11 22 33 44', 'client', true, false, false),
  ('c1000000-0000-0000-0000-000000000002', 'julien.moreau@demo.fr',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Julien',  'Moreau',   '+33 6 22 33 44 55', 'client', true, false, false),
  ('c1000000-0000-0000-0000-000000000003', 'amelie.petit@demo.fr',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Amélie',  'Petit',    '+33 6 33 44 55 66', 'client', true, false, false),
  ('c1000000-0000-0000-0000-000000000004', 'thomas.leroy@demo.fr',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Thomas',  'Leroy',    '+33 6 44 55 66 77', 'client', true, false, false),
  ('c1000000-0000-0000-0000-000000000005', 'claire.dubois@demo.fr',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Claire',  'Dubois',   '+33 6 55 66 77 88', 'client', true, false, false),
  ('c1000000-0000-0000-0000-000000000006', 'marc.lambert@demo.fr',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Marc',    'Lambert',  '+33 6 66 77 88 99', 'client', true, false, false)
ON CONFLICT (id) DO NOTHING;

-- ── 1.b Clients entreprises ──────────────────────────────────
INSERT INTO public.users (id, email, password_hash, first_name, last_name, phone, role, is_active, is_company, company_name, siren, vat_number, company_address, must_change_password) VALUES
  ('c2000000-0000-0000-0000-000000000001', 'contact@boulangerie-rivoli.fr', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Pierre', 'Rivoli',  '+33 1 42 60 12 34', 'client', true, true, 'Boulangerie Rivoli SARL', '812345678', 'FR12812345678', '24 rue de Rivoli, 75004 Paris', false),
  ('c2000000-0000-0000-0000-000000000002', 'gestion@syndic-haussmann.fr',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Hélène', 'Haussmann','+33 1 45 22 33 44', 'client', true, true, 'Syndic Haussmann & Associés', '534567890', 'FR45534567890', '12 boulevard Haussmann, 75009 Paris', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'client'),
  ('c1000000-0000-0000-0000-000000000002', 'client'),
  ('c1000000-0000-0000-0000-000000000003', 'client'),
  ('c1000000-0000-0000-0000-000000000004', 'client'),
  ('c1000000-0000-0000-0000-000000000005', 'client'),
  ('c1000000-0000-0000-0000-000000000006', 'client'),
  ('c2000000-0000-0000-0000-000000000001', 'client'),
  ('c2000000-0000-0000-0000-000000000002', 'client')
ON CONFLICT (user_id, role) DO NOTHING;

-- ── 1.c Techniciens ──────────────────────────────────────────
INSERT INTO public.users (id, email, password_hash, first_name, last_name, phone, role, is_active, is_company, company_name, siren, must_change_password) VALUES
  ('t1000000-0000-0000-0000-000000000001', 'paul.durand@demo.fr',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Paul',    'Durand',    '+33 6 70 11 22 33', 'technician', true, true, 'Plomberie Durand', '901234567', false),
  ('t1000000-0000-0000-0000-000000000002', 'nicolas.roux@demo.fr',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Nicolas', 'Roux',      '+33 6 70 22 33 44', 'technician', true, true, 'Elec Pro Roux',    '902345678', false),
  ('t1000000-0000-0000-0000-000000000003', 'antoine.fournier@demo.fr','$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Antoine', 'Fournier',  '+33 6 70 33 44 55', 'technician', true, true, 'Serrurerie Fournier','903456789', false),
  ('t1000000-0000-0000-0000-000000000004', 'olivier.girard@demo.fr',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Olivier', 'Girard',    '+33 6 70 44 55 66', 'technician', true, true, 'Chauffage Girard', '904567890', false),
  ('t1000000-0000-0000-0000-000000000005', 'samuel.lefevre@demo.fr',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Samuel',  'Lefèvre',   '+33 6 70 55 66 77', 'technician', true, true, 'Multi-services Lefèvre','905678901', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role) VALUES
  ('t1000000-0000-0000-0000-000000000001', 'technician'),
  ('t1000000-0000-0000-0000-000000000002', 'technician'),
  ('t1000000-0000-0000-0000-000000000003', 'technician'),
  ('t1000000-0000-0000-0000-000000000004', 'technician'),
  ('t1000000-0000-0000-0000-000000000005', 'technician')
ON CONFLICT (user_id, role) DO NOTHING;

-- ── 1.d Disponibilité des techniciens ────────────────────────
INSERT INTO public.technician_availability (technician_id, is_available, max_concurrent_interventions) VALUES
  ('t1000000-0000-0000-0000-000000000001', true,  3),
  ('t1000000-0000-0000-0000-000000000002', true,  2),
  ('t1000000-0000-0000-0000-000000000003', true,  4),
  ('t1000000-0000-0000-0000-000000000004', false, 3),
  ('t1000000-0000-0000-0000-000000000005', true,  3)
ON CONFLICT (technician_id) DO NOTHING;

-- ============================================================
-- 2. CANDIDATURES PARTENAIRES
-- ============================================================
INSERT INTO public.partner_applications (
  id, user_id, company_name, siren, ape_code, legal_status,
  has_decennial_insurance, insurance_company, insurance_policy_number, insurance_expiry_date,
  skills, certifications, years_experience, presentation,
  birth_date, birth_place, address, postal_code, city, current_city, department,
  latitude, longitude, has_vehicle, zone,
  bank_account_holder, bank_name, iban, bic,
  status, terms_accepted, data_accuracy_confirmed
) VALUES
  ('a1000000-0000-0000-0000-000000000001',
   't1000000-0000-0000-0000-000000000001',
   'Plomberie Durand', '901234567', '4322A', 'EURL',
   true, 'MAAF Pro', 'POL-2025-PD-1234', '2026-12-31',
   ARRAY['plumbing','heating'], ARRAY['RGE Qualibat'], 12,
   'Plombier-chauffagiste avec 12 ans d''expérience à Paris.',
   '1985-03-14', 'Paris', '5 rue de la Pompe', '75016', 'Paris', 'Paris', '75',
   48.8638, 2.2789, true, 'Paris + petite couronne',
   'Paul Durand', 'Crédit Agricole', 'FR7612345678901234567890123', 'AGRIFRPP123',
   'approved', true, true),

  ('a1000000-0000-0000-0000-000000000002',
   NULL,
   'Vitrerie Express', '910987654', '4334Z', 'SASU',
   false, NULL, NULL, NULL,
   ARRAY['glazing','locksmith'], ARRAY['CAP Miroitier'], 4,
   'Jeune entreprise spécialisée vitrerie et serrurerie d''urgence.',
   '1992-07-22', 'Lyon', '18 rue Garibaldi', '69006', 'Lyon', 'Lyon', '69',
   45.7665, 4.8530, true, 'Lyon centre',
   'Lucie Marchand', 'BNP Paribas', 'FR7630004012345678901234567', 'BNPAFRPP',
   'pending', true, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. INTERVENTIONS
-- ============================================================
-- Statuts représentés : new, assigned, on_route, arrived,
-- in_progress, completed, cancelled.
-- ============================================================

-- Nettoyage idempotent ciblé (toutes les interventions de démo)
DELETE FROM public.interventions WHERE id::text LIKE 'a2______-0000-0000-0000-____________';

INSERT INTO public.interventions (
  id, client_id, technician_id, category, priority, status,
  title, description,
  address, city, postal_code, latitude, longitude,
  client_email, client_phone,
  estimated_price, final_price,
  scheduled_at, accepted_at, started_at, arrived_at, completed_at,
  questionnaire_resultat_id, prix_min, prix_max,
  tracking_code, is_active, created_at
) VALUES
  -- 3.1 Nouvelle demande non assignée (urgent)
  ('a2000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', NULL,
   'plumbing', 'urgent', 'new',
   'Fuite d''eau sous évier',
   'Forte fuite, eau qui coule en continu sous l''évier de la cuisine.',
   '14 rue de Charenton', 'Paris', '75012', 48.8475, 2.3725,
   'sophie.bernard@demo.fr', '+33 6 11 22 33 44',
   180.00, NULL,
   NULL, NULL, NULL, NULL, NULL,
   'a0000000-0000-0000-0000-000000000008', 100, 200,
   'DP-DEMO01', true, now() - interval '15 minutes'),

  -- 3.2 Assignée mais pas encore en route
  ('a2000000-0000-0000-0000-000000000002',
   'c1000000-0000-0000-0000-000000000002', 't1000000-0000-0000-0000-000000000003',
   'locksmith', 'urgent', 'assigned',
   'Ouverture de porte claquée',
   'Porte d''entrée claquée sans les clés, besoin urgent.',
   '8 avenue de la République', 'Paris', '75011', 48.8632, 2.3712,
   'julien.moreau@demo.fr', '+33 6 22 33 44 55',
   150.00, NULL,
   NULL, now() - interval '8 minutes', NULL, NULL, NULL,
   NULL, 120, 220,
   'DP-DEMO02', true, now() - interval '20 minutes'),

  -- 3.3 En route
  ('a2000000-0000-0000-0000-000000000003',
   'c1000000-0000-0000-0000-000000000003', 't1000000-0000-0000-0000-000000000001',
   'plumbing', 'high', 'on_route',
   'Chasse d''eau qui fuit',
   'Le mécanisme de chasse d''eau coule en continu depuis ce matin.',
   '45 rue des Martyrs', 'Paris', '75009', 48.8810, 2.3403,
   'amelie.petit@demo.fr', '+33 6 33 44 55 66',
   120.00, NULL,
   NULL, now() - interval '30 minutes', NULL, NULL, NULL,
   'a0000000-0000-0000-0000-000000000003', 80, 150,
   'DP-DEMO03', true, now() - interval '45 minutes'),

  -- 3.4 Technicien arrivé sur place
  ('a2000000-0000-0000-0000-000000000004',
   'c1000000-0000-0000-0000-000000000004', 't1000000-0000-0000-0000-000000000002',
   'electricity', 'normal', 'arrived',
   'Panne disjoncteur cuisine',
   'Le disjoncteur de la cuisine saute dès qu''on branche le four.',
   '22 rue du Faubourg Saint-Antoine', 'Paris', '75012', 48.8514, 2.3719,
   'thomas.leroy@demo.fr', '+33 6 44 55 66 77',
   220.00, NULL,
   NULL, now() - interval '1 hour', NULL, now() - interval '5 minutes', NULL,
   'a0000000-0000-0000-0000-000000000013', 150, 300,
   'DP-DEMO04', true, now() - interval '1 hour 30 minutes'),

  -- 3.5 En cours d'intervention
  ('a2000000-0000-0000-0000-000000000005',
   'c2000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000004',
   'heating', 'high', 'in_progress',
   'Chaudière en panne',
   'Chaudière gaz qui ne démarre plus, plus d''eau chaude ni de chauffage.',
   '24 rue de Rivoli', 'Paris', '75004', 48.8557, 2.3590,
   'contact@boulangerie-rivoli.fr', '+33 1 42 60 12 34',
   320.00, NULL,
   NULL, now() - interval '3 hours', now() - interval '1 hour 30 minutes', now() - interval '2 hours', NULL,
   NULL, 200, 450,
   'DP-DEMO05', true, now() - interval '4 hours'),

  -- 3.6 Programmée pour plus tard
  ('a2000000-0000-0000-0000-000000000006',
   'c1000000-0000-0000-0000-000000000005', 't1000000-0000-0000-0000-000000000001',
   'plumbing', 'low', 'assigned',
   'Pose d''un nouveau WC',
   'Remplacement du WC actuel par un modèle suspendu.',
   '67 rue de Vaugirard', 'Paris', '75006', 48.8462, 2.3296,
   'claire.dubois@demo.fr', '+33 6 55 66 77 88',
   350.00, NULL,
   now() + interval '2 days', now() - interval '6 hours', NULL, NULL, NULL,
   'a0000000-0000-0000-0000-000000000005', 200, 400,
   'DP-DEMO06', true, now() - interval '8 hours'),

  -- 3.7 Terminée (hier) avec note
  ('a2000000-0000-0000-0000-000000000007',
   'c1000000-0000-0000-0000-000000000006', 't1000000-0000-0000-0000-000000000003',
   'locksmith', 'urgent', 'completed',
   'Changement serrure 3 points',
   'Cambriolage la nuit dernière, besoin de remplacer toute la serrure.',
   '10 rue du Bac', 'Paris', '75007', 48.8567, 2.3258,
   'marc.lambert@demo.fr', '+33 6 66 77 88 99',
   380.00, 380.00,
   NULL,
   now() - interval '1 day 4 hours',
   now() - interval '1 day 2 hours 30 minutes',
   now() - interval '1 day 3 hours',
   now() - interval '1 day 1 hour',
   NULL, 300, 500,
   'DP-DEMO07', true, now() - interval '1 day 5 hours'),

  -- 3.8 Terminée (semaine dernière) avec note
  ('a2000000-0000-0000-0000-000000000008',
   'c1000000-0000-0000-0000-000000000001', 't1000000-0000-0000-0000-000000000001',
   'plumbing', 'normal', 'completed',
   'Remplacement mitigeur salle de bain',
   'Le mitigeur du lavabo goutte en permanence.',
   '14 rue de Charenton', 'Paris', '75012', 48.8475, 2.3725,
   'sophie.bernard@demo.fr', '+33 6 11 22 33 44',
   140.00, 140.00,
   NULL,
   now() - interval '7 days',
   now() - interval '7 days' + interval '40 minutes',
   now() - interval '7 days' + interval '30 minutes',
   now() - interval '7 days' + interval '1 hour 30 minutes',
   'a0000000-0000-0000-0000-000000000009', 80, 200,
   'DP-DEMO08', true, now() - interval '7 days 1 hour'),

  -- 3.9 Annulée
  ('a2000000-0000-0000-0000-000000000009',
   'c1000000-0000-0000-0000-000000000002', 't1000000-0000-0000-0000-000000000005',
   'glazing', 'normal', 'cancelled',
   'Remplacement vitre cassée',
   'Vitre cassée par un ballon, dimensions 60x80 cm.',
   '8 avenue de la République', 'Paris', '75011', 48.8632, 2.3712,
   'julien.moreau@demo.fr', '+33 6 22 33 44 55',
   180.00, NULL,
   NULL, now() - interval '2 days', NULL, NULL, NULL,
   NULL, 120, 250,
   'DP-DEMO09', true, now() - interval '2 days 1 hour'),

  -- 3.10 Intervention longue durée pour syndic (en cours)
  ('a2000000-0000-0000-0000-00000000000a',
   'c2000000-0000-0000-0000-000000000002', 't1000000-0000-0000-0000-000000000002',
   'electricity', 'normal', 'in_progress',
   'Mise aux normes tableau électrique parties communes',
   'Remise en conformité du tableau électrique du hall.',
   '12 boulevard Haussmann', 'Paris', '75009', 48.8721, 2.3318,
   'gestion@syndic-haussmann.fr', '+33 1 45 22 33 44',
   1800.00, NULL,
   NULL,
   now() - interval '5 hours',
   now() - interval '3 hours',
   now() - interval '4 hours',
   NULL,
   'a0000000-0000-0000-0000-000000000014', 800, 2500,
   'DP-DEMO10', true, now() - interval '6 hours')
;

-- ============================================================
-- 4. MESSAGES D'INTERVENTION
-- ============================================================
INSERT INTO public.intervention_messages (intervention_id, sender_id, sender_role, message, is_read, created_at) VALUES
  ('a2000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'client',     'Bonjour, vous arrivez bientôt ?',          true,  now() - interval '20 minutes'),
  ('a2000000-0000-0000-0000-000000000003', 't1000000-0000-0000-0000-000000000001', 'technician', 'Bonjour, je suis en route, arrivée dans 15 min.', true,  now() - interval '18 minutes'),
  ('a2000000-0000-0000-0000-000000000005', 't1000000-0000-0000-0000-000000000004', 'technician', 'Diagnostic en cours, je vous tiens informé.',     false, now() - interval '1 hour'),
  ('a2000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000006', 'client',     'Merci pour votre rapidité hier soir !',          true,  now() - interval '23 hours')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. NOTES & AVIS
-- ============================================================
INSERT INTO public.intervention_ratings (intervention_id, client_id, rating, comment) VALUES
  ('a2000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000006', 5, 'Intervention nocturne ultra rapide, technicien très pro.'),
  ('a2000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000001', 4, 'Bon travail, ponctuel, prix conforme au devis.')
ON CONFLICT (intervention_id) DO NOTHING;

-- ============================================================
-- 6. AUTORISATIONS DE PAIEMENT (Stripe simulé)
-- ============================================================
INSERT INTO public.payment_authorizations (
  intervention_id, payment_provider, provider_payment_id, provider_customer_id,
  amount_authorized, currency, status, client_email, client_phone,
  authorization_confirmed_at, captured_at
) VALUES
  ('a2000000-0000-0000-0000-000000000005', 'stripe', 'pi_demo_inprog_001', 'cus_demo_001',
   500.00, 'eur', 'authorized', 'contact@boulangerie-rivoli.fr', '+33 1 42 60 12 34',
   now() - interval '3 hours', NULL),
  ('a2000000-0000-0000-0000-000000000007', 'stripe', 'pi_demo_done_002',   'cus_demo_002',
   380.00, 'eur', 'captured',  'marc.lambert@demo.fr',         '+33 6 66 77 88 99',
   now() - interval '1 day 4 hours', now() - interval '1 day 1 hour'),
  ('a2000000-0000-0000-0000-000000000008', 'stripe', 'pi_demo_done_003',   'cus_demo_003',
   200.00, 'eur', 'captured',  'sophie.bernard@demo.fr',       '+33 6 11 22 33 44',
   now() - interval '7 days', now() - interval '7 days' + interval '1 hour 30 minutes')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. STATISTIQUES PARTENAIRES
-- ============================================================
INSERT INTO public.partner_statistics (
  partner_id, total_interventions, completed_interventions, cancelled_interventions,
  total_revenue, average_rating, total_ratings
) VALUES
  ('t1000000-0000-0000-0000-000000000001', 42, 39, 1, 6420.00, 4.8, 31),
  ('t1000000-0000-0000-0000-000000000002', 28, 25, 2, 7980.00, 4.6, 19),
  ('t1000000-0000-0000-0000-000000000003', 35, 34, 0, 9120.00, 4.9, 28),
  ('t1000000-0000-0000-0000-000000000004', 18, 16, 1, 5400.00, 4.5, 12),
  ('t1000000-0000-0000-0000-000000000005',  9,  7, 1, 1680.00, 4.3,  6)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================
-- Résumé du jeu de démo :
--   ✅  6 clients particuliers + 2 entreprises
--   ✅  5 techniciens (disponibilités configurées)
--   ✅  2 candidatures partenaires (1 approuvée, 1 en attente)
--   ✅ 10 interventions (tous statuts représentés)
--   ✅  4 messages, 2 avis clients
--   ✅  3 autorisations de paiement Stripe (simulées)
--   ✅  5 statistiques techniciens
--
-- Identifiants de connexion (mot de passe : Demo@2026!) :
--   sophie.bernard@demo.fr      (client)
--   contact@boulangerie-rivoli.fr (client entreprise)
--   paul.durand@demo.fr         (technicien plombier)
--   antoine.fournier@demo.fr    (technicien serrurier)
-- ============================================================
