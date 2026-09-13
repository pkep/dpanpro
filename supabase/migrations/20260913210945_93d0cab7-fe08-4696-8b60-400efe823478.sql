DROP POLICY IF EXISTS "Allow all on article_tags" ON public.article_tags;

CREATE POLICY "Allow all on article_tags"
ON public.article_tags
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);