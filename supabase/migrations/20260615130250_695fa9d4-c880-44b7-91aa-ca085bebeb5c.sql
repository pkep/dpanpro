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