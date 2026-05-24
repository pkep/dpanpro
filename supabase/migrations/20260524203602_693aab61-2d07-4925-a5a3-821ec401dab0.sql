-- 1. Create new bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('technicians', 'technicians', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies on new bucket
CREATE POLICY "Allow public read technicians"
ON storage.objects FOR SELECT
USING (bucket_id = 'technicians');

CREATE POLICY "Allow uploads to technicians"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'technicians');

CREATE POLICY "Allow updates to technicians"
ON storage.objects FOR UPDATE
USING (bucket_id = 'technicians')
WITH CHECK (bucket_id = 'technicians');

CREATE POLICY "Allow deletes from technicians"
ON storage.objects FOR DELETE
USING (bucket_id = 'technicians');

-- 3. Move files (path unchanged)
UPDATE storage.objects
SET bucket_id = 'technicians'
WHERE bucket_id = 'technician-photos';

-- 4. Update URLs in users table
UPDATE public.users
SET avatar_url = REPLACE(avatar_url, '/technician-photos/', '/technicians/')
WHERE avatar_url LIKE '%/technician-photos/%';

UPDATE public.users
SET company_logo_url = REPLACE(company_logo_url, '/technician-photos/', '/technicians/')
WHERE company_logo_url LIKE '%/technician-photos/%';

-- 5. Drop old policies
DROP POLICY IF EXISTS "Allow public read technician-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to technician-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to technician-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from technician-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for technician photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload technician photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own technician photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own technician photos" ON storage.objects;