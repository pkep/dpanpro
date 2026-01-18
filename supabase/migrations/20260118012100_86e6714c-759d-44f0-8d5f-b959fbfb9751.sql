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

-- Create policy for reading history
CREATE POLICY "Allow read for intervention_history"
ON public.intervention_history
FOR SELECT
USING (true);

-- Create policy for inserting history
CREATE POLICY "Allow insert for intervention_history"
ON public.intervention_history
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_intervention_history_intervention_id ON public.intervention_history(intervention_id);
CREATE INDEX idx_intervention_history_created_at ON public.intervention_history(created_at DESC);

-- Enable realtime for interventions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.interventions;