-- ==============================================================================
-- Authory × Tlamatik — Tablas de Obras Culturales, Evidencias y Eventos de Derechos
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.works (
  id text PRIMARY KEY,
  promoter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'other',
  description text NOT NULL DEFAULT '',
  author text NOT NULL,
  artisan text NOT NULL DEFAULT '',
  community text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT 'Oaxaca',
  technique text NOT NULL DEFAULT 'Talla en Madera',
  materials text NOT NULL DEFAULT '',
  dimensions text NOT NULL DEFAULT '',
  price_mxn numeric NOT NULL DEFAULT 0 CHECK (price_mxn >= 0),
  hash text NOT NULL,
  stellar_transaction_id text,
  network text NOT NULL DEFAULT 'testnet',
  status text NOT NULL DEFAULT 'registered',
  filename text,
  file_size text,
  file_mime_type text,
  source_url text,
  file_url text,
  notes text,
  preview_base64 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  registered_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_works_hash ON public.works(hash);
CREATE INDEX IF NOT EXISTS idx_works_author ON public.works(author);
CREATE INDEX IF NOT EXISTS idx_works_promoter_id ON public.works(promoter_id);
CREATE INDEX IF NOT EXISTS idx_works_created_at ON public.works(created_at DESC);

CREATE TABLE IF NOT EXISTS public.rights_events (
  id text PRIMARY KEY,
  work_id text NOT NULL,
  promoter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL, -- 'registration' | 'evidence' | 'license' | 'assignment' | 'transfer'
  actor text NOT NULL,
  recipient text,
  terms text,
  notes text,
  effective_date timestamptz NOT NULL DEFAULT now(),
  stellar_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rights_events_work_id ON public.rights_events(work_id, created_at ASC);

GRANT SELECT ON public.works TO anon, authenticated;
GRANT INSERT, UPDATE ON public.works TO authenticated;
GRANT ALL ON public.works TO service_role;

GRANT SELECT ON public.rights_events TO anon, authenticated;
GRANT INSERT ON public.rights_events TO authenticated;
GRANT ALL ON public.rights_events TO service_role;

ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rights_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read works" ON public.works;
CREATE POLICY "Public read works"
  ON public.works FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated insert own works" ON public.works;
CREATE POLICY "Authenticated insert own works"
  ON public.works FOR INSERT
  TO authenticated
  WITH CHECK (promoter_id IS NULL OR promoter_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated update own works" ON public.works;
CREATE POLICY "Authenticated update own works"
  ON public.works FOR UPDATE
  TO authenticated
  USING (promoter_id = auth.uid())
  WITH CHECK (promoter_id = auth.uid());

DROP POLICY IF EXISTS "Public read rights_events" ON public.rights_events;
CREATE POLICY "Public read rights_events"
  ON public.rights_events FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated insert rights_events" ON public.rights_events;
CREATE POLICY "Authenticated insert rights_events"
  ON public.rights_events FOR INSERT
  TO authenticated
  WITH CHECK (promoter_id IS NULL OR promoter_id = auth.uid());

INSERT INTO storage.buckets (id, name, public)
VALUES ('authory-files', 'authory-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read authory-files" ON storage.objects;
CREATE POLICY "Public read authory-files"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'authory-files');

DROP POLICY IF EXISTS "Authenticated upload authory-files" ON storage.objects;
CREATE POLICY "Authenticated upload authory-files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'authory-files');

