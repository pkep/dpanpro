ALTER TABLE public.interventions
  ADD COLUMN IF NOT EXISTS other_prestation_label TEXT,
  ADD COLUMN IF NOT EXISTS other_prestation_price NUMERIC;