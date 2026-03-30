-- AI Studio foundation: prompts, field definitions, extraction runs, and feedback

CREATE TABLE IF NOT EXISTS public.ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL DEFAULT 'general',
  language_code TEXT NOT NULL DEFAULT 'hu',
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  schema_prompt TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doc_type, language_code, version)
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_lookup
  ON public.ai_prompt_versions(doc_type, language_code, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL DEFAULT 'general',
  field_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('text', 'number', 'boolean', 'date', 'array')),
  is_required BOOLEAN NOT NULL DEFAULT false,
  prompt_snippet TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doc_type, field_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_field_definitions_lookup
  ON public.ai_field_definitions(doc_type, is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.ai_extraction_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prompt_version_id UUID REFERENCES public.ai_prompt_versions(id) ON DELETE SET NULL,
  model TEXT,
  language_code TEXT,
  doc_type TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed')),
  confidence NUMERIC(4,3),
  extracted_fields JSONB,
  raw_output TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_extraction_runs_created_at
  ON public.ai_extraction_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_extraction_runs_document
  ON public.ai_extraction_runs(document_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.ai_extraction_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('helpful', 'not_helpful', 'incorrect', 'confusing')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(run_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at
  ON public.ai_feedback(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at_ai_studio()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_prompt_versions_updated_at ON public.ai_prompt_versions;
CREATE TRIGGER trg_ai_prompt_versions_updated_at
  BEFORE UPDATE ON public.ai_prompt_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_ai_studio();

DROP TRIGGER IF EXISTS trg_ai_field_definitions_updated_at ON public.ai_field_definitions;
CREATE TRIGGER trg_ai_field_definitions_updated_at
  BEFORE UPDATE ON public.ai_field_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_ai_studio();

ALTER TABLE public.ai_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_extraction_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users to active config, write access for admins.
DROP POLICY IF EXISTS "Authenticated can view active AI prompts" ON public.ai_prompt_versions;
CREATE POLICY "Authenticated can view active AI prompts"
  ON public.ai_prompt_versions
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can manage AI prompts" ON public.ai_prompt_versions;
CREATE POLICY "Only admins can manage AI prompts"
  ON public.ai_prompt_versions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can view active AI field definitions" ON public.ai_field_definitions;
CREATE POLICY "Authenticated can view active AI field definitions"
  ON public.ai_field_definitions
  FOR SELECT
  TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Only admins can manage AI field definitions" ON public.ai_field_definitions;
CREATE POLICY "Only admins can manage AI field definitions"
  ON public.ai_field_definitions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can view own or admin AI extraction runs" ON public.ai_extraction_runs;
CREATE POLICY "Users can view own or admin AI extraction runs"
  ON public.ai_extraction_runs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role can insert AI extraction runs" ON public.ai_extraction_runs;
CREATE POLICY "Service role can insert AI extraction runs"
  ON public.ai_extraction_runs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update AI extraction runs" ON public.ai_extraction_runs;
CREATE POLICY "Service role can update AI extraction runs"
  ON public.ai_extraction_runs
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own or admin AI feedback" ON public.ai_feedback;
CREATE POLICY "Users can view own or admin AI feedback"
  ON public.ai_feedback
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own AI feedback" ON public.ai_feedback;
CREATE POLICY "Users can insert own AI feedback"
  ON public.ai_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own AI feedback" ON public.ai_feedback;
CREATE POLICY "Users can update own AI feedback"
  ON public.ai_feedback
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_ai_quality_summary(_days integer DEFAULT 30)
RETURNS TABLE(
  total_runs bigint,
  success_runs bigint,
  failed_runs bigint,
  avg_confidence numeric,
  helpful_feedback bigint,
  negative_feedback bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH runs AS (
    SELECT *
    FROM public.ai_extraction_runs
    WHERE created_at >= now() - make_interval(days => GREATEST(_days, 1))
  ),
  feedback AS (
    SELECT af.*
    FROM public.ai_feedback af
    JOIN runs r ON r.id = af.run_id
  )
  SELECT
    COUNT(*)::bigint AS total_runs,
    COUNT(*) FILTER (WHERE status = 'success')::bigint AS success_runs,
    COUNT(*) FILTER (WHERE status = 'failed')::bigint AS failed_runs,
    ROUND(AVG(confidence)::numeric, 3) AS avg_confidence,
    COUNT(*) FILTER (WHERE rating = 'helpful')::bigint AS helpful_feedback,
    COUNT(*) FILTER (WHERE rating IN ('not_helpful', 'incorrect', 'confusing'))::bigint AS negative_feedback
  FROM runs
  LEFT JOIN feedback ON true;
$$;

-- Seed baseline prompt and core fields if missing
INSERT INTO public.ai_prompt_versions (doc_type, language_code, version, name, system_prompt, schema_prompt, is_active, notes)
SELECT
  'general',
  'hu',
  1,
  'Alap magyar prompt v1',
  'A feladatod magyar közigazgatási dokumentumok elemzése. Adj pontos, rövid, közérthető és jogilag helyes választ.',
  'Mindig JSON objektummal válaszolj, és tartsd be a megadott mezőneveket.',
  true,
  'Automatikus seed'
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_prompt_versions WHERE doc_type = 'general' AND language_code = 'hu' AND version = 1
);

INSERT INTO public.ai_field_definitions (doc_type, field_key, display_name, data_type, is_required, prompt_snippet, sort_order, is_active)
SELECT * FROM (VALUES
  ('general', 'simple_summary', 'Egyszerű összefoglaló', 'text', true, 'Foglald össze közérthetően, tegező stílusban.', 10, true),
  ('general', 'legal_summary', 'Jogi összefoglaló', 'text', true, 'Adj professzionális jogi kivonatot.', 20, true),
  ('general', 'todo_simple', 'Teendők (egyszerű)', 'array', true, 'Adj rövid teendőlistát egyszerű nyelven.', 30, true),
  ('general', 'todo_legal', 'Teendők (jogi)', 'array', true, 'Adj jogi teendőlistát.', 40, true),
  ('general', 'deadlines', 'Határidők', 'array', false, 'Gyűjtsd ki a határidőket YYYY-MM-DD formátumban.', 50, true),
  ('general', 'severity', 'Súlyosság', 'text', true, 'Érték: info | action_needed | urgent.', 60, true)
) AS seed(doc_type, field_key, display_name, data_type, is_required, prompt_snippet, sort_order, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_field_definitions afd
  WHERE afd.doc_type = seed.doc_type AND afd.field_key = seed.field_key
);
