
INSERT INTO storage.buckets (id, name, public)
VALUES ('interventions', 'interventions', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read interventions"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'interventions');

CREATE POLICY "Allow upload interventions"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'interventions');

CREATE POLICY "Allow delete interventions"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'interventions');

-- Move work-photos: work-photos/{intId}/{type}/x -> {intId}/work-photos/{type}/x
UPDATE storage.objects
SET bucket_id = 'interventions',
    name = regexp_replace(name, '^work-photos/([^/]+)/(before|after)/(.*)$', '\1/work-photos/\2/\3')
WHERE bucket_id = 'intervention-photos'
  AND name ~ '^work-photos/[^/]+/(before|after)/';

-- Move temp/ as-is
UPDATE storage.objects
SET bucket_id = 'interventions'
WHERE bucket_id = 'intervention-photos'
  AND name LIKE 'temp/%';

-- Move {intId}/x -> {intId}/photos/x
UPDATE storage.objects
SET bucket_id = 'interventions',
    name = regexp_replace(name, '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/([^/]+)$', '\1/photos/\2')
WHERE bucket_id = 'intervention-photos'
  AND name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$';

-- Update intervention_work_photos.photo_url
UPDATE intervention_work_photos
SET photo_url = regexp_replace(
  photo_url,
  '/intervention-photos/work-photos/([^/]+)/(before|after)/',
  '/interventions/\1/work-photos/\2/'
)
WHERE photo_url LIKE '%/intervention-photos/work-photos/%';

-- Update interventions.photos array
UPDATE interventions
SET photos = ARRAY(
  SELECT
    CASE
      WHEN p LIKE '%/intervention-photos/temp/%'
        THEN replace(p, '/intervention-photos/temp/', '/interventions/temp/')
      WHEN p ~ '/intervention-photos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
        THEN regexp_replace(
          p,
          '/intervention-photos/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/([^/]+)$',
          '/interventions/\1/photos/\2'
        )
      ELSE p
    END
  FROM unnest(photos) AS p
)
WHERE EXISTS (SELECT 1 FROM unnest(photos) AS p WHERE p LIKE '%/intervention-photos/%');

-- Drop old policies (bucket itself must be deleted via Storage UI)
DROP POLICY IF EXISTS "Allow public read intervention photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload intervention photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete intervention photos" ON storage.objects;
