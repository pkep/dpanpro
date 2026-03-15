
INSERT INTO public.notification_settings (event_type, channel, is_enabled, applicable_roles, description)
VALUES
  ('technician_accepted', 'email', true, ARRAY['technician'], 'Email de félicitations lors de l''acceptation d''un technicien'),
  ('technician_rejected', 'email', true, ARRAY['technician'], 'Email de refus de candidature technicien');
