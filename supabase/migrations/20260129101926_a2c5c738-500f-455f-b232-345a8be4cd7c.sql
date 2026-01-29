-- Create password reset tokens table
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can insert password reset tokens"
ON public.password_reset_tokens
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can select password reset tokens"
ON public.password_reset_tokens
FOR SELECT
USING (true);

CREATE POLICY "Anyone can update password reset tokens"
ON public.password_reset_tokens
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Index for faster token lookup
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);