
-- Notification settings: admin global config per event type and channel
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('push', 'sms', 'email')),
  is_enabled boolean NOT NULL DEFAULT true,
  applicable_roles text[] NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_type, channel)
);

-- User notification preferences: per-user overrides
CREATE TABLE public.user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('push', 'sms', 'email')),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_type, channel)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS for notification_settings: everyone can read, only admins can manage
CREATE POLICY "Anyone can view notification settings" ON public.notification_settings
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage notification settings" ON public.notification_settings
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS for user_notification_preferences: users manage their own
CREATE POLICY "Users can view their own preferences" ON public.user_notification_preferences
  FOR SELECT TO public USING (true);

CREATE POLICY "Users can manage their own preferences" ON public.user_notification_preferences
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Updated_at triggers
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
