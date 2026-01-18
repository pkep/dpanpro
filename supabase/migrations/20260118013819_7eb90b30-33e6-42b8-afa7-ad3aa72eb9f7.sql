-- Create storage bucket for intervention photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('intervention-photos', 'intervention-photos', true);

-- Policy: Allow authenticated users to upload photos
CREATE POLICY "Allow upload intervention photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'intervention-photos');

-- Policy: Allow public read access to photos
CREATE POLICY "Allow public read intervention photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'intervention-photos');

-- Policy: Allow users to delete their own photos
CREATE POLICY "Allow delete intervention photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'intervention-photos');