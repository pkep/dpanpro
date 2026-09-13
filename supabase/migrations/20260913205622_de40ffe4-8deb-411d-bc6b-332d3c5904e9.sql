DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='authors' LOOP
    EXECUTE format('DROP POLICY %I ON public.authors', r.policyname);
  END LOOP;
END $$;