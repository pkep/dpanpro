CREATE TABLE IF NOT EXISTS public.scheduled_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES public.interventions(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'CANCELLED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.scheduled_reminders DROP CONSTRAINT IF EXISTS scheduled_reminders_reminder_type_check;
ALTER TABLE public.scheduled_reminders ADD CONSTRAINT scheduled_reminders_reminder_type_check
  CHECK (reminder_type IN ('HALF_TIME','FIVE_MINUTES','SUSPENDED_J3','SUSPENDED_J2','SUSPENDED_J1'));

CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_due ON public.scheduled_reminders (status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_intervention ON public.scheduled_reminders (intervention_id);

GRANT ALL ON public.scheduled_reminders TO service_role;

ALTER TABLE public.scheduled_reminders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_scheduled_reminders_updated_at
BEFORE UPDATE ON public.scheduled_reminders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();