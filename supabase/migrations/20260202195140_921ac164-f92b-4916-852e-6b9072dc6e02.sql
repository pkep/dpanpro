-- Drop existing restrictive policies on technician-photos bucket
DROP POLICY IF EXISTS "Technicians can upload their photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can update their photos" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can delete their photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view technician photos" ON storage.objects;

-- Create permissive policies for technician-photos bucket (using custom auth)
CREATE POLICY "Allow uploads to technician-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'technician-photos');

CREATE POLICY "Allow updates to technician-photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'technician-photos')
WITH CHECK (bucket_id = 'technician-photos');

CREATE POLICY "Allow deletes from technician-photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'technician-photos');

CREATE POLICY "Allow public read technician-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'technician-photos');