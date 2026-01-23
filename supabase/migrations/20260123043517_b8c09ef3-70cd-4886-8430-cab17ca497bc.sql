-- Create commission configuration table
CREATE TABLE public.commission_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID UNIQUE, -- NULL means global default
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 15.00, -- Percentage (e.g., 15.00 = 15%)
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view commission settings"
ON public.commission_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage commission settings"
ON public.commission_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_commission_settings_updated_at
BEFORE UPDATE ON public.commission_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default global commission rate (15%)
INSERT INTO public.commission_settings (partner_id, commission_rate)
VALUES (NULL, 15.00);