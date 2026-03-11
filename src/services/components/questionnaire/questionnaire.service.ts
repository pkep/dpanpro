import { supabase } from '@/integrations/supabase/client';
import type { QuestionnaireNode, QuestionnaireResult, QuestionnaireOption, QuestionnaireDomain } from '@/data/questionnaire-tree';

interface DbQuestion {
  id: string;
  domaine_code: string;
  libelle: string;
  sous_libelle: string | null;
  est_racine: boolean;
  parent_reponse_id: string | null;
  display_order: number;
  is_active: boolean;
  image_url: string | null;
}

interface DbReponse {
  id: string;
  question_id: string;
  next_question_id: string | null;
  resultat_id: string | null;
  label: string;
  icone: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface DbResultat {
  id: string;
  domaine_code: string;
  slug: string;
  nom: string;
  description: string | null;
  prix_min: number | null;
  prix_max: number | null;
  unite_prix: string;
  duree_min_minutes: number | null;
  duree_max_minutes: number | null;
  urgence_disponible: boolean;
  garantie_jours: number | null;
  is_active: boolean;
}

interface DbVariante {
  id: string;
  resultat_id: string;
  nom: string;
  description: string | null;
  prix_min: number | null;
  prix_max: number | null;
  display_order: number;
  is_active: boolean;
}

// Map domaine_code to tier based on price range
function computeTier(prixMin: number | null, prixMax: number | null): 'low' | 'mid' | 'high' | 'xhigh' {
  const max = prixMax ?? prixMin ?? 0;
  if (max <= 150) return 'low';
  if (max <= 300) return 'mid';
  if (max <= 800) return 'high';
  return 'xhigh';
}

function formatDuration(minMinutes: number | null, maxMinutes: number | null): string | null {
  if (!minMinutes && !maxMinutes) return null;
  const formatTime = (m: number) => {
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest > 0 ? `${h}h${rest}` : `${h}h`;
  };
  if (minMinutes && maxMinutes) return `${formatTime(minMinutes)}–${formatTime(maxMinutes)}`;
  return formatTime(minMinutes || maxMinutes!);
}

function buildResult(resultat: DbResultat, variantes: DbVariante[]): QuestionnaireResult {
  const prix = resultat.prix_min != null && resultat.prix_max != null
    ? `${resultat.prix_min} – ${resultat.prix_max} €`
    : resultat.prix_min != null
    ? `${resultat.prix_min} €`
    : 'Sur devis';

  const meta: string[] = [];
  if (resultat.urgence_disponible) meta.push('Urgence 24/7');
  if (resultat.garantie_jours) {
    if (resultat.garantie_jours >= 365) meta.push(`Garantie ${Math.round(resultat.garantie_jours / 365)} an${resultat.garantie_jours >= 730 ? 's' : ''}`);
    else meta.push(`Garantie ${resultat.garantie_jours}j`);
  }
  const duration = formatDuration(resultat.duree_min_minutes, resultat.duree_max_minutes);
  if (duration) meta.push(duration);

  const variantesList: [string, string][] = variantes
    .filter(v => v.is_active)
    .sort((a, b) => a.display_order - b.display_order)
    .map(v => {
      const vPrix = v.prix_min != null && v.prix_max != null
        ? `${v.prix_min} – ${v.prix_max} €`
        : v.prix_min != null ? `${v.prix_min} €` : 'Sur devis';
      return [v.nom, vPrix];
    });

  return {
    nom: resultat.nom,
    prix,
    tier: computeTier(resultat.prix_min, resultat.prix_max),
    desc: resultat.description || '',
    variantes: variantesList.length > 0 ? variantesList : undefined,
    meta: meta.length > 0 ? meta : undefined,
  };
}

class QuestionnaireService {
  private cache: Record<string, QuestionnaireDomain> | null = null;

  async getQuestionnaireTree(): Promise<Record<string, QuestionnaireDomain>> {
    if (this.cache) return this.cache;

    const [questionsRes, reponsesRes, resultatsRes, variantesRes] = await Promise.all([
      supabase.from('questionnaire_questions').select('*').eq('is_active', true),
      supabase.from('questionnaire_reponses').select('*').eq('is_active', true),
      supabase.from('questionnaire_resultats').select('*').eq('is_active', true),
      supabase.from('questionnaire_variantes').select('*').eq('is_active', true),
    ]);

    if (questionsRes.error) throw questionsRes.error;
    if (reponsesRes.error) throw reponsesRes.error;
    if (resultatsRes.error) throw resultatsRes.error;
    if (variantesRes.error) throw variantesRes.error;

    const questions = (questionsRes.data || []) as DbQuestion[];
    const reponses = (reponsesRes.data || []) as DbReponse[];
    const resultats = (resultatsRes.data || []) as DbResultat[];
    const variantes = (variantesRes.data || []) as DbVariante[];

    // Index data
    const questionMap = new Map<string, DbQuestion>();
    questions.forEach(q => questionMap.set(q.id, q));

    const reponsesByQuestion = new Map<string, DbReponse[]>();
    reponses.forEach(r => {
      const list = reponsesByQuestion.get(r.question_id) || [];
      list.push(r);
      reponsesByQuestion.set(r.question_id, list);
    });

    const resultatMap = new Map<string, DbResultat>();
    resultats.forEach(r => resultatMap.set(r.id, r));

    const variantesByResultat = new Map<string, DbVariante[]>();
    variantes.forEach(v => {
      const list = variantesByResultat.get(v.resultat_id) || [];
      list.push(v);
      variantesByResultat.set(v.resultat_id, list);
    });

    // Build tree recursively
    const buildNode = (questionId: string, visited = new Set<string>()): QuestionnaireNode | null => {
      if (visited.has(questionId)) return null; // prevent cycles
      visited.add(questionId);

      const question = questionMap.get(questionId);
      if (!question) return null;

      const qReponses = (reponsesByQuestion.get(questionId) || [])
        .sort((a, b) => a.display_order - b.display_order);

      const options: QuestionnaireOption[] = qReponses.map(r => {
        const option: QuestionnaireOption = {
          label: r.label,
          icon: r.icone || undefined,
        };

        if (r.resultat_id) {
          const resultat = resultatMap.get(r.resultat_id);
          if (resultat) {
            option.result = buildResult(resultat, variantesByResultat.get(resultat.id) || []);
          }
        } else if (r.next_question_id) {
          const nextNode = buildNode(r.next_question_id, new Set(visited));
          if (nextNode) {
            option.next = nextNode;
          }
        }

        return option;
      });

      return {
        id: question.id,
        question: question.libelle,
        sub: question.sous_libelle || undefined,
        options,
      };
    };

    // Find root questions per domain
    const rootQuestions = questions
      .filter(q => q.est_racine)
      .sort((a, b) => a.display_order - b.display_order);

    const tree: Record<string, QuestionnaireDomain> = {};

    // Domain config mapping
    const domainConfig: Record<string, { label: string; icon: string; color: string }> = {
      plumbing: { label: 'Plomberie', icon: '💧', color: '#3b82f6' },
      locksmith: { label: 'Serrurerie', icon: '🔑', color: '#f59e0b' },
      electricity: { label: 'Électricité', icon: '⚡', color: '#eab308' },
      glazing: { label: 'Vitrerie', icon: '🪟', color: '#06b6d4' },
      heating: { label: 'Chauffage', icon: '🔥', color: '#ef4444' },
      aircon: { label: 'Climatisation', icon: '❄️', color: '#0ea5e9' },
    };

    for (const rootQ of rootQuestions) {
      const node = buildNode(rootQ.id);
      if (!node) continue;

      const config = domainConfig[rootQ.domaine_code] || { label: rootQ.domaine_code, icon: '🔧', color: '#6b7280' };

      tree[rootQ.domaine_code] = {
        id: rootQ.domaine_code,
        label: config.label,
        icon: config.icon,
        color: config.color,
        question: node.question,
        sub: node.sub,
        options: node.options,
      };
    }

    this.cache = tree;
    return tree;
  }

  clearCache() {
    this.cache = null;
  }
}

export const questionnaireService = new QuestionnaireService();
