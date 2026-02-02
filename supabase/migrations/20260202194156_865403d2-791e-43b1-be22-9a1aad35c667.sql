-- Add avatar_url and company_logo_url to users table for technician photos
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS company_logo_url text;

-- Create storage bucket for technician profile photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('technician-photos', 'technician-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for technician photos bucket
CREATE POLICY "Anyone can view technician photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'technician-photos');

CREATE POLICY "Authenticated users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'technician-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'technician-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'technician-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);