-- Table pour les modifications de devis (ajouts de prestations/équipements)
CREATE TABLE public.quote_modifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  total_additional_amount NUMERIC NOT NULL DEFAULT 0,
  client_notified_at TIMESTAMP WITH TIME ZONE,
  client_responded_at TIMESTAMP WITH TIME ZONE,
  notification_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les lignes de modification de devis
CREATE TABLE public.quote_modification_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modification_id UUID NOT NULL REFERENCES public.quote_modifications(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'equipment', 'other')),
  label TEXT NOT NULL,
  description TEXT,
  unit_price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les messages chat entre technicien et client
CREATE TABLE public.intervention_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('technician', 'client')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quote_modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_modification_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for quote_modifications
CREATE POLICY "Anyone can view quote modifications"
  ON public.quote_modifications FOR SELECT USING (true);

CREATE POLICY "Technicians can insert quote modifications"
  ON public.quote_modifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update quote modifications"
  ON public.quote_modifications FOR UPDATE USING (true) WITH CHECK (true);

-- RLS policies for quote_modification_items
CREATE POLICY "Anyone can view quote modification items"
  ON public.quote_modification_items FOR SELECT USING (true);

CREATE POLICY "Technicians can insert quote modification items"
  ON public.quote_modification_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete quote modification items"
  ON public.quote_modification_items FOR DELETE USING (true);

-- RLS policies for intervention_messages
CREATE POLICY "Anyone can view intervention messages"
  ON public.intervention_messages FOR SELECT USING (true);

CREATE POLICY "Anyone can insert intervention messages"
  ON public.intervention_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update intervention messages"
  ON public.intervention_messages FOR UPDATE USING (true) WITH CHECK (true);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.intervention_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_modifications;

-- Triggers for updated_at
CREATE TRIGGER update_quote_modifications_updated_at
  BEFORE UPDATE ON public.quote_modifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_quote_modifications_intervention ON public.quote_modifications(intervention_id);
CREATE INDEX idx_quote_modifications_token ON public.quote_modifications(notification_token);
CREATE INDEX idx_quote_modification_items_modification ON public.quote_modification_items(modification_id);
CREATE INDEX idx_intervention_messages_intervention ON public.intervention_messages(intervention_id);