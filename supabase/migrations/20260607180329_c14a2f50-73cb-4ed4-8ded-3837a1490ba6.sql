CREATE TABLE public.action_notification_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  roles public.app_role[] NULL,
  email TEXT[] NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_notification_recipients TO authenticated;
GRANT ALL ON public.action_notification_recipients TO service_role;

ALTER TABLE public.action_notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and managers can view recipients"
  ON public.action_notification_recipients FOR SELECT
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can insert recipients"
  ON public.action_notification_recipients FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can update recipients"
  ON public.action_notification_recipients FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can delete recipients"
  ON public.action_notification_recipients FOR DELETE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_action_notification_recipients_updated_at
  BEFORE UPDATE ON public.action_notification_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX action_notification_recipients_action_key
  ON public.action_notification_recipients(action);

INSERT INTO public.action_notification_recipients (action, roles, email)
VALUES ('welcome-job-technician', ARRAY['manager','admin']::public.app_role[], ARRAY['k3pcontact@gmail.com']);
