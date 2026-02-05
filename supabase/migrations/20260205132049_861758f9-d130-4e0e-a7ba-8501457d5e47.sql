-- Add setting for priority multiplier toggle
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES ('priority_multiplier_enabled', 'true', 'Active ou désactive l''application du coefficient multiplicateur de priorité sur les devis')
ON CONFLICT (setting_key) DO NOTHING;