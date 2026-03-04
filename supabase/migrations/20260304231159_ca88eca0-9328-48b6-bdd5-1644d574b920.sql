
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
