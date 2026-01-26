-- Create push_subscriptions table for storing FCM tokens (for both users and guests)
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NULL,
  email TEXT NULL,
  fcm_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  device_info JSONB NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_or_email_required CHECK (user_id IS NOT NULL OR email IS NOT NULL)
);

-- Create indexes for fast lookups
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_push_subscriptions_email ON public.push_subscriptions(email) WHERE email IS NOT NULL;
CREATE INDEX idx_push_subscriptions_fcm_token ON public.push_subscriptions(fcm_token);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow public registration (for guests)
CREATE POLICY "Anyone can register push subscription"
ON public.push_subscriptions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (true);

CREATE POLICY "Anyone can update their push subscription"
ON public.push_subscriptions FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete push subscription"
ON public.push_subscriptions FOR DELETE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();