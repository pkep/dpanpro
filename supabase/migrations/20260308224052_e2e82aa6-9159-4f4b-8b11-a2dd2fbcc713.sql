
-- Table for email verification tokens
CREATE TABLE public.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert verification tokens" ON public.email_verification_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can select verification tokens" ON public.email_verification_tokens FOR SELECT USING (true);
CREATE POLICY "Anyone can update verification tokens" ON public.email_verification_tokens FOR UPDATE USING (true) WITH CHECK (true);

-- Index for quick token lookup
CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);
