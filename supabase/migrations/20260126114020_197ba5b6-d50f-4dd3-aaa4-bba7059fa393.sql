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