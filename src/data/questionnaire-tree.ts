// ═══════════════════════════════════════════════════════
// Arbre complet du questionnaire interactif V2
// Structure : chaque nœud est soit une question (avec options)
// soit un résultat terminal avec pricing.
// ═══════════════════════════════════════════════════════

export interface QuestionnaireResult {
  nom: string;
  prix: string;
  tier: 'low' | 'mid' | 'high' | 'xhigh';
  desc: string;
  variantes?: [string, string][];
  meta?: string[];
}

export interface QuestionnaireOption {
  label: string;
  icon?: string;
  result?: QuestionnaireResult;
  next?: QuestionnaireNode;
}

export interface QuestionnaireNode {
  id?: string;
  label?: string;
  icon?: string;
  color?: string;
  question: string;
  sub?: string;
  options: QuestionnaireOption[];
}

export interface QuestionnaireDomain {
  id: string;
  label: string;
  icon: string;
  color: string;
  question: string;
  sub?: string;
  options: QuestionnaireOption[];
}

export const QUESTIONNAIRE_TREE: Record<string, QuestionnaireDomain> = {

  // ══════════════════ PLOMBERIE ══════════════════
  plumbing: {
    id: 'plumbing', label: 'Plomberie', icon: '💧', color: '#3b82f6',
    question: 'Où se situe votre problème ?',
    sub: 'Indiquez la zone concernée dans votre logement',
    options: [
      { label: 'WC', icon: '🚽',
        next: {
          question: 'Dans quel domaine avez-vous besoin d\'aide ?',
          options: [
            { label: 'Engorgement / bouchon', icon: '💩',
              result: { nom: 'Débouchage WC', prix: '100 – 200 €', tier: 'mid',
                desc: 'Intervention avec furet ou pression selon l\'obstruction.',
                variantes: [['WC standard (furet)', '100 – 150 €'], ['WC sanibroyeur', '130 – 200 €'], ['Haute pression', '300 – 500 €']],
                meta: ['Urgence 24/7', 'Garantie 48h', '30–90 min'] } },
            { label: 'Fuite au sol', icon: '💧',
              result: { nom: 'Fuite WC / joint de cuvette', prix: '80 – 150 €', tier: 'low',
                desc: 'Remplacement joint ou flexible de raccordement.',
                variantes: [['Joint simple', '80 – 100 €'], ['Flexible + joint', '100 – 150 €']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '30–60 min'] } },
            { label: 'Chasse défaillante', icon: '🔄',
              result: { nom: 'Réparation chasse d\'eau', prix: '80 – 150 €', tier: 'low',
                desc: 'Remplacement mécanisme de chasse (flotteur, clapet, cloche).',
                variantes: [['Remplacement clapet/flotteur', '80 – 120 €'], ['Mécanisme complet', '100 – 150 €']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '30–60 min'] } },
            { label: 'Remplacement WC', icon: '🔩',
              next: {
                question: 'Quel type de WC souhaitez-vous ?',
                options: [
                  { label: 'WC standard à poser', icon: '🚽',
                    result: { nom: 'Pose WC standard', prix: '150 – 300 €', tier: 'mid',
                      desc: 'Dépose ancien WC + fourniture et pose WC posé.',
                      variantes: [['Main d\'œuvre seule', '100 – 150 €'], ['Fourniture + pose', '150 – 300 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '1–2h'] } },
                  { label: 'WC suspendu', icon: '🪣',
                    result: { nom: 'Pose WC suspendu', prix: '200 – 400 €', tier: 'mid',
                      desc: 'Bâti support + cuvette suspendue + plaque de commande.',
                      variantes: [['Bâti + cuvette entrée de gamme', '200 – 300 €'], ['Bâti + cuvette haut de gamme', '300 – 400 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '2–4h'] } },
                  { label: 'Sanibroyeur', icon: '⚙️',
                    result: { nom: 'Fourniture + pose sanibroyeur', prix: '900 – 1100 €', tier: 'xhigh',
                      desc: 'Installation complète avec évacuation broyée.',
                      variantes: [['Sanibroyeur standard', '900 – 1000 €'], ['Sanibroyeur silencieux', '1000 – 1100 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '3–5h'] } }
                ]
              }
            }
          ]
        }
      },
      { label: 'Évier / lavabo', icon: '🚿',
        next: {
          question: 'Quel est le problème ?',
          options: [
            { label: 'Bouchon / eau stagnante', icon: '🚫',
              result: { nom: 'Débouchage évier / lavabo', prix: '100 – 180 €', tier: 'mid',
                desc: 'Débouchage par furet spirale ou aspiration haute pression.',
                variantes: [['Furet manuel', '100 – 130 €'], ['Haute pression', '130 – 180 €']],
                meta: ['Urgence 24/7', 'Garantie 48h', '30–60 min'] } },
            { label: 'Fuite sous le meuble', icon: '💧',
              result: { nom: 'Fuite canalisation apparente', prix: '100 – 200 €', tier: 'mid',
                desc: 'Remplacement siphon, joint ou section de canalisation visible.',
                variantes: [['Siphon + joints', '80 – 120 €'], ['Remplacement section tuyau', '120 – 200 €']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '30–90 min'] } },
            { label: 'Robinet à changer', icon: '🔧',
              result: { nom: 'Changement robinet / mitigeur', prix: '80 – 200 €', tier: 'low',
                desc: 'Remplacement robinet simple ou mitigeur standard.',
                variantes: [['Robinet simple', '80 – 120 €'], ['Mitigeur standard', '100 – 150 €'], ['Mitigeur thermostatique', '150 – 200 €']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '30–60 min'] } }
          ]
        }
      },
      { label: 'Douche / baignoire', icon: '🛁',
        next: {
          question: 'Quel est le problème ?',
          options: [
            { label: 'Évacuation bouchée', icon: '🚫',
              result: { nom: 'Débouchage douche / baignoire', prix: '100 – 180 €', tier: 'mid',
                desc: 'Nettoyage du siphon et traitement de l\'obstruction.',
                variantes: [['Siphon + furet', '100 – 140 €'], ['Haute pression', '140 – 180 €']],
                meta: ['Urgence 24/7', 'Garantie 48h', '30–60 min'] } },
            { label: 'Fuite robinet / mitigeur', icon: '💧',
              result: { nom: 'Changement robinet / mitigeur', prix: '80 – 200 €', tier: 'low',
                desc: 'Remplacement mitigeur de douche ou de baignoire.',
                variantes: [['Mitigeur douche standard', '100 – 150 €'], ['Mitigeur thermostatique', '150 – 200 €']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '30–60 min'] } }
          ]
        }
      },
      { label: 'Chauffe-eau', icon: '♨️',
        next: {
          question: 'Quel est votre type de chauffe-eau ?',
          options: [
            { label: 'Électrique', icon: '⚡',
              next: {
                question: 'Quel est le problème ?',
                options: [
                  { label: 'Fuite visible', icon: '💧',
                    result: { nom: 'Fuite chauffe-eau électrique', prix: '100 – 220 €', tier: 'mid',
                      desc: 'Remplacement groupe de sécurité, joint ou anode.',
                      variantes: [['Groupe sécurité + joint', '100 – 150 €'], ['Anode + vérification', '120 – 180 €'], ['Remplacement si nécessaire', '350 – 1000 €']],
                      meta: ['Urgence 24/7', 'Garantie 1 an', '1–2h'] } },
                  { label: 'Plus d\'eau chaude', icon: '🌡️',
                    result: { nom: 'Réparation ballon électrique', prix: '100 – 200 €', tier: 'mid',
                      desc: 'Diagnostic résistance, thermostat ou corrosion.',
                      variantes: [['Remplacement résistance', '100 – 160 €'], ['Thermostat défaillant', '100 – 150 €'], ['Remplacement ballon 80L', '400 – 600 €']],
                      meta: ['Urgence 24/7', 'Garantie 1 an', '1–3h'] } },
                  { label: 'Remplacement complet', icon: '🔄',
                    result: { nom: 'Remplacement ballon électrique', prix: '350 – 1500 €', tier: 'high',
                      desc: 'Fourniture et pose d\'un nouveau ballon selon capacité.',
                      variantes: [['50 L (studio)', '350 – 500 €'], ['80 L (T2/T3)', '400 – 600 €'], ['150–200 L (maison)', '600 – 1000 €'], ['Thermodynamique', '800 – 1500 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '2–4h'] } }
                ]
              }
            },
            { label: 'Gaz', icon: '🔥',
              result: { nom: 'Chauffe-eau gaz — diagnostic', prix: '150 – 350 €', tier: 'mid',
                desc: 'Intervention sur chauffe-eau gaz instantané ou à accumulation.',
                variantes: [['Réparation pièce', '150 – 250 €'], ['Remplacement veilleuse/thermocouple', '100 – 200 €'], ['Remplacement complet', '500 – 1000 €']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '1–3h'] } }
          ]
        }
      },
      { label: 'Canalisation', icon: '🔧',
        next: {
          question: 'De quel type de fuite s\'agit-il ?',
          options: [
            { label: 'Fuite visible / apparente', icon: '💧',
              result: { nom: 'Fuite canalisation apparente', prix: '100 – 200 €', tier: 'mid',
                desc: 'Réparation ou remplacement d\'une section de canalisation accessible.',
                variantes: [['Collier + joint provisoire', '80 – 120 €'], ['Remplacement section PER/PVC', '120 – 200 €']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '1–2h'] } },
            { label: 'Fuite encastrée / mur', icon: '🏗️',
              result: { nom: 'Fuite canalisation encastrée', prix: '500 – 1000 €', tier: 'xhigh',
                desc: 'Recherche de fuite non destructive + réparation nécessitant ouverture.',
                variantes: [['Recherche électronique seule', '150 – 300 €'], ['Recherche + réparation', '500 – 800 €'], ['Réfection carrelage incluse', '700 – 1000 €']],
                meta: ['Sur RDV', 'Garantie 1 an', '2–8h'] } },
            { label: 'Colonne d\'immeuble', icon: '🏢',
              result: { nom: 'Débouchage colonne générale', prix: '700 – 900 €', tier: 'xhigh',
                desc: 'Intervention sur colonne collective avec camion hydrocureur.',
                variantes: [['Hydrocurage standard', '700 – 800 €'], ['Hydrocurage + inspection caméra', '800 – 900 €']],
                meta: ['Sur RDV syndic', 'Garantie 48h', '2–4h'] } }
          ]
        }
      }
    ]
  },

  // ══════════════════ ÉLECTRICITÉ ══════════════════
  electricity: {
    id: 'electricity', label: 'Électricité', icon: '⚡', color: '#f59e0b',
    question: 'Quel est le problème électrique ?',
    sub: 'Décrivez la panne ou l\'installation souhaitée',
    options: [
      { label: 'Panne électrique', icon: '🔌',
        next: {
          question: 'Que se passe-t-il exactement ?',
          options: [
            { label: 'Disjoncteur qui saute', icon: '⚡',
              next: {
                question: 'Quelle est la situation ?',
                options: [
                  { label: 'Disjoncteur différentiel seul', icon: '🔘',
                    result: { nom: 'Remplacement disjoncteur différentiel', prix: '150 – 300 €', tier: 'mid',
                      desc: 'Diagnostic + remplacement du différentiel défaillant.',
                      variantes: [['Diagnostic + réarmement', '80 – 120 €'], ['Remplacement différentiel 25A', '150 – 220 €'], ['Remplacement différentiel 40A+', '200 – 300 €']],
                      meta: ['Urgence 24/7', 'Garantie 1 an', '1–2h'] } },
                  { label: 'Tableau complet obsolète', icon: '🗃️',
                    result: { nom: 'Remplacement tableau électrique', prix: '800 – 2500 €', tier: 'xhigh',
                      desc: 'Dépose ancien tableau + pose nouveau tableau NF C 15-100.',
                      variantes: [['Studio / T1 (4–6 circuits)', '800 – 1200 €'], ['T2/T3 (6–10 circuits)', '1200 – 1800 €'], ['T4 / maison (10+ circuits)', '1800 – 2500 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '4–8h'] } }
                ]
              }
            },
            { label: 'Prises / zone sans courant', icon: '🔌',
              result: { nom: 'Panne circuit prises', prix: '150 – 300 €', tier: 'mid',
                desc: 'Diagnostic et réparation d\'un circuit de prises défaillant.',
                variantes: [['Diagnostic + réarmement', '80 – 120 €'], ['Réparation fusible/disjoncteur', '150 – 200 €'], ['Remplacement câble section', '200 – 300 €']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '1–3h'] } },
            { label: 'Plus de lumière', icon: '💡',
              result: { nom: 'Dépannage circuit éclairage', prix: '150 – 250 €', tier: 'mid',
                desc: 'Vérification circuit éclairage, remplacement interrupteur ou câble.',
                variantes: [['Remplacement interrupteur', '80 – 130 €'], ['Réparation circuit complet', '150 – 250 €']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '1–2h'] } }
          ]
        }
      },
      { label: 'Installation / équipement', icon: '🔧',
        next: {
          question: 'Que souhaitez-vous installer ?',
          options: [
            { label: 'Prise ou interrupteur', icon: '🔌',
              result: { nom: 'Pose prise / interrupteur', prix: '80 – 150 €', tier: 'low',
                desc: 'Pose d\'une prise 16A ou d\'un interrupteur va-et-vient.',
                variantes: [['Prise simple 16A', '80 – 100 €'], ['Prise 2P+T 20A', '100 – 130 €'], ['Interrupteur double', '100 – 150 €']],
                meta: ['Sur RDV', 'Garantie 1 an', '30–60 min'] } },
            { label: 'Point lumineux', icon: '💡',
              result: { nom: 'Pose luminaire / spots', prix: '80 – 300 €', tier: 'low',
                desc: 'Branchement luminaire ou création de circuit spots encastrés.',
                variantes: [['Pose lustre/plafonnier', '80 – 130 €'], ['Kit 3 spots encastrés', '150 – 250 €'], ['Kit 6 spots + variateur', '200 – 300 €']],
                meta: ['Sur RDV', 'Garantie 1 an', '1–3h'] } },
            { label: 'Borne recharge VE', icon: '🚗',
              result: { nom: 'Installation borne IRVE', prix: '800 – 2000 €', tier: 'xhigh',
                desc: 'Pose borne de recharge véhicule électrique avec mise en service.',
                variantes: [['Wallbox 7 kW (mono)', '800 – 1200 €'], ['Wallbox 11 kW (tri)', '1000 – 1500 €'], ['Borne avec délestage', '1400 – 2000 €']],
                meta: ['Sur RDV', 'Garantie 2 ans', '3–6h'] } },
            { label: 'Diagnostic installation', icon: '📋',
              result: { nom: 'Diagnostic électrique', prix: '150 – 300 €', tier: 'mid',
                desc: 'Contrôle conformité NF C 15-100, rapport détaillé.',
                variantes: [['Appartement < 60 m²', '150 – 200 €'], ['Appartement 60–100 m²', '180 – 250 €'], ['Maison > 100 m²', '250 – 300 €']],
                meta: ['Sur RDV', 'Rapport fourni', '2–4h'] } }
          ]
        }
      }
    ]
  },

  // ══════════════════ SERRURERIE ══════════════════
  locksmith: {
    id: 'locksmith', label: 'Serrurerie', icon: '🔑', color: '#a855f7',
    question: 'Quel est votre besoin en serrurerie ?',
    sub: 'Urgence ou sécurisation',
    options: [
      { label: 'Je suis bloqué dehors', icon: '🚪',
        next: {
          question: 'Décrivez votre porte',
          options: [
            { label: 'Porte claquée (clé à l\'intérieur)', icon: '😰',
              next: {
                question: 'Quel type de porte ?',
                options: [
                  { label: 'Porte standard', icon: '🚪',
                    result: { nom: 'Ouverture porte claquée — standard', prix: '130 – 150 €', tier: 'low',
                      desc: 'Ouverture sans dommage par crochetage ou carte.',
                      variantes: [['Ouverture simple', '130 – 150 €']],
                      meta: ['Urgence 24/7', '15–30 min', 'Sans dégât garanti'] } },
                  { label: 'Porte blindée / 3 points', icon: '🛡️',
                    result: { nom: 'Ouverture porte blindée claquée', prix: '150 – 200 €', tier: 'mid',
                      desc: 'Technique non destructive adaptée aux portes renforcées.',
                      variantes: [['Blindage standard', '150 – 175 €'], ['Blindage haute sécurité', '175 – 200 €']],
                      meta: ['Urgence 24/7', '30–60 min', 'Sans dégât garanti'] } }
                ]
              }
            },
            { label: 'Porte verrouillée (clé perdue)', icon: '🔐',
              next: {
                question: 'Quel type de porte ?',
                options: [
                  { label: 'Porte standard', icon: '🚪',
                    result: { nom: 'Ouverture porte verrouillée — standard', prix: '150 – 220 €', tier: 'mid',
                      desc: 'Crochetage ou cylindre sacrifié selon serrure.',
                      variantes: [['Ouverture sans casse', '150 – 180 €'], ['Avec remplacement cylindre', '180 – 220 €']],
                      meta: ['Urgence 24/7', '30–60 min'] } },
                  { label: 'Porte blindée', icon: '🛡️',
                    result: { nom: 'Ouverture porte blindée verrouillée', prix: '200 – 350 €', tier: 'mid',
                      desc: 'Intervention longue sur serrure multipoints.',
                      variantes: [['3 points', '200 – 280 €'], ['5 points A2P', '280 – 350 €']],
                      meta: ['Urgence 24/7', '1–2h'] } }
                ]
              }
            },
            { label: 'Suite à cambriolage', icon: '🚨',
              result: { nom: 'Ouverture + sécurisation urgence', prix: '200 – 400 €', tier: 'mid',
                desc: 'Ouverture immédiate + condamnation provisoire de la porte.',
                variantes: [['Ouverture + condamnation', '200 – 300 €'], ['+ Remplacement serrure urgence', '300 – 400 €']],
                meta: ['Urgence 24/7', '30–90 min'] } }
          ]
        }
      },
      { label: 'Changer / renforcer la serrure', icon: '🔧',
        next: {
          question: 'Que souhaitez-vous changer ?',
          options: [
            { label: 'Cylindre seul', icon: '🔩',
              result: { nom: 'Changement de cylindre', prix: '120 – 200 €', tier: 'mid',
                desc: 'Dépose ancien cylindre + pose cylindre A2P selon niveau de sécurité.',
                variantes: [['Cylindre standard', '120 – 150 €'], ['Cylindre A2P 1★', '150 – 180 €'], ['Cylindre A2P 2★', '180 – 200 €']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '30–60 min'] } },
            { label: 'Serrure multipoints', icon: '🔐',
              next: {
                question: 'Quel niveau de sécurité ?',
                options: [
                  { label: 'Serrure 3 points standard', icon: '🔒',
                    result: { nom: 'Serrure 3 points', prix: '400 – 600 €', tier: 'high',
                      desc: 'Dépose + pose serrure 3 points avec cylindre inclus.',
                      variantes: [['Entrée de gamme', '400 – 500 €'], ['Avec cylindre A2P', '500 – 600 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '1–2h'] } },
                  { label: 'Serrure 5 points A2P', icon: '🛡️',
                    result: { nom: 'Serrure 5 points haute sécurité', prix: '600 – 1000 €', tier: 'xhigh',
                      desc: 'Serrure multipoints avec certification A2P BP.',
                      variantes: [['5 pts A2P BP1', '600 – 750 €'], ['5 pts A2P BP2', '750 – 900 €'], ['5 pts A2P BP3', '900 – 1000 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '2–3h'] } }
                ]
              }
            },
            { label: 'Blindage de porte', icon: '🛡️',
              next: {
                question: 'Type de blindage souhaité ?',
                options: [
                  { label: 'Blindage porte existante', icon: '🔨',
                    result: { nom: 'Blindage porte existante', prix: '500 – 900 €', tier: 'high',
                      desc: 'Pose de plaques acier sur porte existante + serrure renforcée.',
                      variantes: [['Blindage simple acier', '500 – 700 €'], ['Blindage + pivot + 5pts', '700 – 900 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '3–6h'] } },
                  { label: 'Porte blindée complète', icon: '🚪',
                    result: { nom: 'Porte blindée A2P BP', prix: '1000 – 3500 €', tier: 'xhigh',
                      desc: 'Remplacement complet par porte certifiée A2P.',
                      variantes: [['A2P 1★ BP1', '1000 – 1500 €'], ['A2P 2★ BP2', '1200 – 1800 €'], ['A2P 3★ BP3', '1500 – 3500 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '1 journée'] } }
                ]
              }
            }
          ]
        }
      },
      { label: 'Autre serrurerie', icon: '🔩',
        next: {
          question: 'Quel équipement ?',
          options: [
            { label: 'Boîte aux lettres', icon: '📬',
              result: { nom: 'Serrure boîte aux lettres', prix: '70 – 150 €', tier: 'low',
                desc: 'Remplacement serrure ou cylindre BAL normalisé.',
                variantes: [['Serrure standard', '70 – 100 €'], ['Cylindre sécurisé', '100 – 150 €']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '30 min'] } },
            { label: 'Portail / garage', icon: '🏠',
              result: { nom: 'Serrure portail / garage', prix: '150 – 350 €', tier: 'mid',
                desc: 'Remplacement serrure ou motorisation portail/porte de garage.',
                variantes: [['Serrure portail simple', '150 – 200 €'], ['Motorisation portail', '250 – 350 €']],
                meta: ['Sur RDV', 'Garantie 1 an', '1–2h'] } }
          ]
        }
      }
    ]
  },

  // ══════════════════ VITRERIE ══════════════════
  glazing: {
    id: 'glazing', label: 'Vitrerie', icon: '🪟', color: '#06b6d4',
    question: 'Quel est votre besoin en vitrerie ?',
    sub: 'Bris, remplacement ou étanchéité',
    options: [
      { label: 'Vitre cassée / fissurée', icon: '💥',
        next: {
          question: 'Quel type de vitrage faut-il remplacer ?',
          options: [
            { label: 'Vitrage simple (1 seule paroi)', icon: '🪟',
              result: { nom: 'Remplacement vitre simple', prix: '65 – 200 €/m²', tier: 'low',
                desc: 'Dépose bris + coupe et pose verre simple.',
                variantes: [['Simple clair', '65 – 100 €/m²'], ['Feuilleté sécurité', '150 – 280 €/m²'], ['Anti-effraction', '200 – 350 €/m²']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '1–2h'] } },
            { label: 'Double vitrage (fenêtre)', icon: '🏠',
              next: {
                question: 'Quel matériau de menuiserie ?',
                options: [
                  { label: 'PVC', icon: '🟦',
                    result: { nom: 'Fenêtre double vitrage PVC', prix: '350 – 600 €', tier: 'high',
                      desc: 'Remplacement fenêtre PVC double vitrage 4/16/4.',
                      variantes: [['60×90 cm', '350 – 450 €'], ['90×120 cm', '450 – 550 €'], ['120×140 cm', '500 – 600 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '2–4h'] } },
                  { label: 'Aluminium', icon: '⬜',
                    result: { nom: 'Fenêtre double vitrage ALU', prix: '500 – 800 €', tier: 'high',
                      desc: 'Remplacement fenêtre aluminium double vitrage avec RPT.',
                      variantes: [['Standard', '500 – 650 €'], ['RPT haute performance', '650 – 800 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '2–4h'] } },
                  { label: 'Bois', icon: '🪵',
                    result: { nom: 'Fenêtre double vitrage Bois', prix: '500 – 900 €', tier: 'high',
                      desc: 'Remplacement fenêtre bois lasurée ou peinte.',
                      variantes: [['Bois pin', '500 – 700 €'], ['Bois chêne / exotique', '700 – 900 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '2–4h'] } }
                ]
              }
            },
            { label: 'Velux / fenêtre de toit', icon: '🏔️',
              result: { nom: 'Remplacement Velux / fenêtre toit', prix: '600 – 1200 €', tier: 'xhigh',
                desc: 'Dépose + pose fenêtre de toit avec raccord étanchéité.',
                variantes: [['Simple vitrage', '600 – 800 €'], ['Double vitrage', '800 – 1000 €'], ['Triple vitrage', '1000 – 1200 €']],
                meta: ['Sur RDV', 'Garantie 2 ans', '3–5h'] } }
          ]
        }
      },
      { label: 'Mécanisme fenêtre défaillant', icon: '🔧',
        next: {
          question: 'Quel mécanisme est défaillant ?',
          options: [
            { label: 'Crémone', icon: '🔩',
              result: { nom: 'Remplacement crémone', prix: '80 – 150 €', tier: 'low',
                desc: 'Dépose ancienne crémone + pose crémone compatible.',
                variantes: [['Crémone standard', '80 – 120 €'], ['Crémone multipoints', '120 – 150 €']],
                meta: ['Sur RDV', 'Garantie 1 an', '30–60 min'] } },
            { label: 'Poignée cassée', icon: '✋',
              result: { nom: 'Remplacement poignée fenêtre', prix: '60 – 120 €', tier: 'low',
                desc: 'Remplacement poignée avec ou sans cylindre de sécurité.',
                variantes: [['Poignée standard', '60 – 80 €'], ['Poignée avec clé', '80 – 120 €']],
                meta: ['Sur RDV', 'Garantie 1 an', '30 min'] } },
            { label: 'Fenêtre qui frotte / coince', icon: '😤',
              result: { nom: 'Rabotage / réglage fenêtre', prix: '80 – 150 €', tier: 'low',
                desc: 'Réglage des paumelles, rabotage ou ajustement des joints.',
                variantes: [['Réglage charnières', '80 – 100 €'], ['Rabotage bois', '100 – 150 €']],
                meta: ['Sur RDV', 'Garantie 1 an', '30–90 min'] } }
          ]
        }
      },
      { label: 'Problème d\'étanchéité', icon: '💧',
        next: {
          question: 'Où est le problème d\'étanchéité ?',
          options: [
            { label: 'Joints fenêtre / porte-fenêtre', icon: '🪟',
              result: { nom: 'Remplacement joints fenêtre', prix: '50 – 150 €', tier: 'low',
                desc: 'Dépose anciens joints + pose joints EPDM ou silicone.',
                variantes: [['Joints 1 fenêtre', '50 – 80 €'], ['Joints 3 fenêtres', '100 – 150 €']],
                meta: ['Sur RDV', 'Garantie 2 ans', '30–90 min'] } },
            { label: 'Joints douche / salle de bain', icon: '🚿',
              result: { nom: 'Joints silicone douche / baignoire', prix: '80 – 150 €', tier: 'low',
                desc: 'Dépose anciens joints moisis + nettoyage + joints silicone sanitaire.',
                variantes: [['Douche (4 côtés)', '80 – 120 €'], ['Baignoire complète', '100 – 150 €']],
                meta: ['Sur RDV', 'Garantie 1 an', 'Séchage 24h'] } }
          ]
        }
      }
    ]
  },

  // ══════════════════ CHAUFFAGE ══════════════════
  heating: {
    id: 'heating', label: 'Chauffage', icon: '🔥', color: '#ef4444',
    question: 'Quel est votre système de chauffage ?',
    sub: 'Identifiez votre équipement',
    options: [
      { label: 'Chaudière gaz', icon: '🔥',
        next: {
          question: 'Quel est le problème ?',
          options: [
            { label: 'Plus de chauffage / eau chaude', icon: '❄️',
              result: { nom: 'Dépannage chaudière gaz', prix: '150 – 500 €', tier: 'mid',
                desc: 'Diagnostic + réparation selon pièce défaillante.',
                variantes: [['Carte électronique', '200 – 500 €'], ['Brûleur / vanne gaz', '150 – 350 €'], ['Circulateur', '150 – 300 €'], ['Sonde / thermocouple', '100 – 250 €']],
                meta: ['Urgence 24/7', 'Garantie 1 an', '1–3h'] } },
            { label: 'Entretien annuel obligatoire', icon: '📋',
              result: { nom: 'Entretien chaudière gaz', prix: '150 – 180 €', tier: 'low',
                desc: 'Contrôle, nettoyage, réglage combustion + attestation.',
                variantes: [['Chaudière murale', '150 – 170 €'], ['Chaudière à condensation', '160 – 180 €']],
                meta: ['Sur RDV', 'Attestation fournie', '1–1h30'] } },
            { label: 'Remplacement chaudière', icon: '🔄',
              next: {
                question: 'Quel type de chaudière souhaitez-vous ?',
                options: [
                  { label: 'Murale standard', icon: '📦',
                    result: { nom: 'Remplacement chaudière gaz standard', prix: '2000 – 3500 €', tier: 'xhigh',
                      desc: 'Dépose ancienne chaudière + fourniture et pose.',
                      variantes: [['24 kW', '2000 – 2800 €'], ['30 kW', '2500 – 3500 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '1 journée'] } },
                  { label: 'Condensation (économique)', icon: '💧',
                    result: { nom: 'Remplacement chaudière condensation', prix: '2500 – 5000 €', tier: 'xhigh',
                      desc: 'Chaudière à condensation rendement >100% PCI.',
                      variantes: [['24 kW', '2500 – 3500 €'], ['30 kW', '3000 – 4500 €'], ['+ régulation', '3500 – 5000 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '1 journée'] } }
                ]
              }
            }
          ]
        }
      },
      { label: 'Radiateurs', icon: '♨️',
        next: {
          question: 'Quel est le problème avec vos radiateurs ?',
          options: [
            { label: 'Radiateur froid / peu chaud', icon: '❄️',
              result: { nom: 'Purge radiateurs + équilibrage circuit', prix: '80 – 400 €', tier: 'low',
                desc: 'Purge de l\'air emprisonné dans les radiateurs et équilibrage.',
                variantes: [['Purge 1 radiateur', '80 – 120 €'], ['Purge circuit complet', '150 – 300 €'], ['Désembouage complet', '300 – 600 €']],
                meta: ['Sur RDV', 'Garantie 1 an', '1–4h'] } },
            { label: 'Robinet thermostatique HS', icon: '🔧',
              result: { nom: 'Remplacement robinet thermostatique', prix: '100 – 200 €', tier: 'mid',
                desc: 'Dépose ancien robinet + pose robinet thermostatique.',
                variantes: [['Robinet standard', '100 – 150 €'], ['Tête connectée', '150 – 200 €']],
                meta: ['Sur RDV', 'Garantie 1 an', '30–60 min'] } },
            { label: 'Pose d\'un nouveau radiateur', icon: '➕',
              result: { nom: 'Pose radiateur chauffage central', prix: '250 – 400 €', tier: 'mid',
                desc: 'Raccordement + pose radiateur sur circuit existant.',
                variantes: [['Radiateur acier standard', '250 – 350 €'], ['Radiateur fonte', '300 – 400 €']],
                meta: ['Sur RDV', 'Garantie 2 ans', '2–4h'] } }
          ]
        }
      },
      { label: 'Chaudière fioul', icon: '🛢️',
        next: {
          question: 'Quel est le problème ?',
          options: [
            { label: 'Entretien annuel', icon: '📋',
              result: { nom: 'Entretien chaudière fioul', prix: '150 – 200 €', tier: 'mid',
                desc: 'Contrôle, nettoyage brûleur et échangeur, ramonage + attestation.',
                variantes: [['Entretien standard', '150 – 180 €'], ['Entretien + ramonage', '180 – 200 €']],
                meta: ['Sur RDV', 'Attestation fournie', '1h30–2h'] } },
            { label: 'Panne', icon: '❌',
              result: { nom: 'Réparation chaudière fioul', prix: '200 – 600 €', tier: 'mid',
                desc: 'Diagnostic + réparation brûleur, pompe à fioul ou carte.',
                variantes: [['Brûleur', '200 – 400 €'], ['Pompe à fioul', '200 – 350 €'], ['Carte électronique', '300 – 600 €']],
                meta: ['Sur RDV', 'Garantie 1 an', '1–3h'] } }
          ]
        }
      }
    ]
  },

  // ══════════════════ CLIM & PAC ══════════════════
  aircon: {
    id: 'aircon', label: 'Clim & Pompe à chaleur', icon: '❄️', color: '#22c55e',
    question: 'Quel est votre équipement ?',
    sub: 'Climatisation ou pompe à chaleur',
    options: [
      { label: 'Climatisation', icon: '❄️',
        next: {
          question: 'Que souhaitez-vous ?',
          options: [
            { label: 'Installation nouvelle clim', icon: '🔧',
              next: {
                question: 'Combien de pièces à climatiser ?',
                options: [
                  { label: '1 pièce (monosplit)', icon: '1️⃣',
                    result: { nom: 'Installation clim monosplit', prix: '1200 – 2500 €', tier: 'xhigh',
                      desc: 'Fourniture + pose 1 unité intérieure + 1 unité extérieure.',
                      variantes: [['2,5 kW — 25 m²', '1200 – 1800 €'], ['3,5 kW — 35 m²', '1400 – 2000 €'], ['5 kW — 50 m²', '1800 – 2500 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '4–6h'] } },
                  { label: '2 pièces (bisplit)', icon: '2️⃣',
                    result: { nom: 'Installation clim bisplit', prix: '2000 – 3500 €', tier: 'xhigh',
                      desc: '1 groupe extérieur + 2 unités intérieures.',
                      variantes: [['2×2,5 kW', '2000 – 2800 €'], ['2×3,5 kW', '2500 – 3500 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '6–8h'] } },
                  { label: '3 pièces et plus', icon: '3️⃣',
                    result: { nom: 'Installation clim multisplit', prix: '2800 – 5000 €', tier: 'xhigh',
                      desc: '1 groupe extérieur + 3 unités intérieures ou plus.',
                      variantes: [['Trisplit 3×2,5 kW', '2800 – 4000 €'], ['Quadrisplit', '3500 – 5000 €']],
                      meta: ['Sur RDV', 'Garantie 2 ans', '1–2 journées'] } }
                ]
              }
            },
            { label: 'Entretien / maintenance', icon: '🧹',
              result: { nom: 'Entretien climatisation', prix: '150 – 400 €', tier: 'mid',
                desc: 'Nettoyage filtres, unités intérieure et extérieure, contrôle fluide.',
                variantes: [['Monosplit (filtres + int.)', '150 – 180 €'], ['Monosplit complet + ext.', '170 – 220 €'], ['Bisplit', '200 – 300 €'], ['Trisplit', '280 – 400 €']],
                meta: ['Sur RDV', 'Garantie 1 an', '1–2h'] } },
            { label: 'Panne / dépannage', icon: '🚨',
              next: {
                question: 'Quel symptôme observez-vous ?',
                options: [
                  { label: 'Ne refroidit / ne chauffe plus', icon: '🌡️',
                    result: { nom: 'Dépannage clim — perte de puissance', prix: '200 – 800 €', tier: 'mid',
                      desc: 'Diagnostic fuite gaz, compresseur ou carte électronique.',
                      variantes: [['Recharge gaz R410A/R32', '200 – 400 €'], ['Compresseur HS', '300 – 800 €'], ['Carte électronique', '200 – 500 €']],
                      meta: ['Urgence 24/7', 'Garantie 1 an', '1–3h'] } },
                  { label: 'Fuite d\'eau unité intérieure', icon: '💧',
                    result: { nom: 'Fuite eau unité intérieure', prix: '150 – 300 €', tier: 'mid',
                      desc: 'Nettoyage bac + tuyau de condensats bouché.',
                      variantes: [['Nettoyage condensats', '150 – 200 €'], ['Remplacement pompe relevage', '200 – 300 €']],
                      meta: ['Urgence 24/7', 'Garantie 1 an', '1–2h'] } },
                  { label: 'Bruit anormal', icon: '📢',
                    result: { nom: 'Diagnostic bruit clim', prix: '150 – 300 €', tier: 'mid',
                      desc: 'Contrôle fixations, ventilateur et compresseur.',
                      variantes: [['Resserrage + vibrations', '150 – 180 €'], ['Remplacement ventilateur', '200 – 300 €']],
                      meta: ['Sur RDV', 'Garantie 1 an', '1–2h'] } }
                ]
              }
            }
          ]
        }
      },
      { label: 'Pompe à chaleur (PAC)', icon: '🌡️',
        next: {
          question: 'Quel type de PAC ?',
          options: [
            { label: 'PAC air/air (soufflage)', icon: '💨',
              result: { nom: 'Installation PAC air/air', prix: '2500 – 8000 €', tier: 'xhigh',
                desc: 'Pompe à chaleur avec distribution par soufflage d\'air.',
                variantes: [['Monosplit petite surface', '2500 – 4000 €'], ['Multisplit grande surface', '4000 – 8000 €']],
                meta: ['Sur RDV', 'Garantie 2 ans', '1–2 journées'] } },
            { label: 'PAC air/eau (radiateurs)', icon: '♨️',
              result: { nom: 'Installation PAC air/eau', prix: '7000 – 15000 €', tier: 'xhigh',
                desc: 'PAC avec distribution via radiateurs ou plancher chauffant.',
                variantes: [['Sur radiateurs', '7000 – 12000 €'], ['Sur plancher chauffant', '10000 – 15000 €']],
                meta: ['Sur RDV', 'Garantie 2 ans', '2–3 journées'] } },
            { label: 'Entretien / dépannage PAC', icon: '🔧',
              result: { nom: 'Entretien & dépannage PAC', prix: '150 – 600 €', tier: 'mid',
                desc: 'Entretien annuel ou réparation pompe à chaleur.',
                variantes: [['Entretien annuel PAC', '150 – 250 €'], ['Dépannage panne', '200 – 600 €'], ['Recharge fluide', '200 – 500 €']],
                meta: ['Sur RDV', 'Garantie 1 an', '1–3h'] } }
          ]
        }
      }
    ]
  }
};
