CREATE TABLE public.phone_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  intervention_type text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_phone_verification_codes_phone_code
  ON public.phone_verification_codes (phone, code);
CREATE INDEX idx_phone_verification_codes_expires_at
  ON public.phone_verification_codes (expires_at);

ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert phone codes"
  ON public.phone_verification_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view phone codes"
  ON public.phone_verification_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can update phone codes"
  ON public.phone_verification_codes FOR UPDATE USING (true) WITH CHECK (true);