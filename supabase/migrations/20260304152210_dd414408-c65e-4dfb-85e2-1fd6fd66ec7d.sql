
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

-- Everyone can read questionnaire data
CREATE POLICY "Anyone can view questionnaire resultats" ON public.questionnaire_resultats FOR SELECT USING (true);
CREATE POLICY "Anyone can view questionnaire variantes" ON public.questionnaire_variantes FOR SELECT USING (true);
CREATE POLICY "Anyone can view questionnaire questions" ON public.questionnaire_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can view questionnaire reponses" ON public.questionnaire_reponses FOR SELECT USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage questionnaire resultats" ON public.questionnaire_resultats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage questionnaire variantes" ON public.questionnaire_variantes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage questionnaire questions" ON public.questionnaire_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage questionnaire reponses" ON public.questionnaire_reponses FOR ALL USING (true) WITH CHECK (true);

-- Add columns to interventions table for questionnaire result reference
ALTER TABLE public.interventions 
    ADD COLUMN IF NOT EXISTS questionnaire_resultat_id UUID REFERENCES public.questionnaire_resultats(id),
    ADD COLUMN IF NOT EXISTS questionnaire_answers JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS prix_min DECIMAL(8,2),
    ADD COLUMN IF NOT EXISTS prix_max DECIMAL(8,2);
