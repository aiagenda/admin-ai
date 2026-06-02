-- ============================================================
-- Admin CMS: blog_posts table + revenue/subscriber stats RPC
-- ============================================================

-- Blog posts table (CMS backend for the article writer)
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  slug          TEXT        UNIQUE NOT NULL,
  description   TEXT        NOT NULL DEFAULT '',
  content       TEXT        NOT NULL DEFAULT '',  -- paragraphs separated by \n\n
  keywords      TEXT        NOT NULL DEFAULT '',
  market        TEXT        NOT NULL DEFAULT 'us' CHECK (market IN ('us', 'hu', 'both')),
  is_published  BOOLEAN     NOT NULL DEFAULT false,
  published_at  TIMESTAMPTZ,
  date_label    TEXT,            -- display string e.g. "May 28, 2026"
  badge_text    TEXT,
  badge_variant TEXT        DEFAULT 'secondary',
  faq_schema    JSONB,           -- [{question, answer}]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can read published posts
DROP POLICY IF EXISTS "blog_posts_published_read" ON public.blog_posts;
CREATE POLICY "blog_posts_published_read" ON public.blog_posts
  FOR SELECT USING (is_published = true);

-- Admins can read/write all posts
DROP POLICY IF EXISTS "blog_posts_admin_all" ON public.blog_posts;
CREATE POLICY "blog_posts_admin_all" ON public.blog_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug       ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_market     ON public.blog_posts (market);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published  ON public.blog_posts (is_published, published_at DESC);

-- ============================================================
-- Revenue & subscriber stats RPC (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_revenue_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO _is_admin;

  IF NOT _is_admin THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  RETURN jsonb_build_object(
    -- Plan distribution
    'plan_breakdown', (
      SELECT COALESCE(jsonb_object_agg(plan_type, cnt), '{}'::jsonb)
      FROM (
        SELECT plan_type, COUNT(*)::int AS cnt
        FROM public.user_subscriptions
        GROUP BY plan_type
      ) t
    ),
    -- Paying subscribers (active subscriptions, not free/trial)
    'paying_count', (
      SELECT COUNT(*)::int FROM public.user_subscriptions
      WHERE plan_type IN ('monthly', 'business', 'enterprise')
        AND (subscription_status IS NULL OR subscription_status IN ('active', 'trialing'))
    ),
    -- Free trial users
    'free_trial_count', (
      SELECT COUNT(*)::int FROM public.user_subscriptions
      WHERE plan_type = 'free' AND free_trial_docs_used = 0
    ),
    -- Users with prepaid credits
    'prepaid_count', (
      SELECT COUNT(*)::int FROM public.user_subscriptions
      WHERE prepaid_basic_credits > 0 OR prepaid_pro_credits > 0
    ),
    -- New users in last 7 / 30 days
    'new_users_7d', (
      SELECT COUNT(*)::int FROM auth.users
      WHERE created_at >= now() - interval '7 days'
    ),
    'new_users_30d', (
      SELECT COUNT(*)::int FROM auth.users
      WHERE created_at >= now() - interval '30 days'
    ),
    -- Document volume
    'docs_this_month', (
      SELECT COUNT(*)::int FROM public.documents
      WHERE created_at >= date_trunc('month', now())
    ),
    'docs_last_month', (
      SELECT COUNT(*)::int FROM public.documents
      WHERE created_at >= date_trunc('month', now() - interval '1 month')
        AND created_at <  date_trunc('month', now())
    ),
    'analyses_this_month', (
      SELECT COUNT(*)::int FROM public.analyses
      WHERE created_at >= date_trunc('month', now())
    ),
    -- OCR feedback quality
    'feedback_helpful', (
      SELECT COUNT(*)::int FROM public.analysis_feedback WHERE rating = 'helpful'
    ),
    'feedback_not_helpful', (
      SELECT COUNT(*)::int FROM public.analysis_feedback WHERE rating != 'helpful'
    ),
    -- Recent 10 users for the user list widget
    'recent_users', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          u.id,
          u.email,
          u.created_at,
          u.last_sign_in_at,
          us.plan_type,
          us.subscription_status,
          us.free_trial_docs_used,
          us.prepaid_basic_credits,
          us.prepaid_pro_credits,
          (SELECT COUNT(*)::int FROM public.documents d WHERE d.user_id = u.id) AS doc_count
        FROM auth.users u
        LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
        ORDER BY u.created_at DESC
        LIMIT 10
      ) t
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_revenue_stats() IS
  'Admin only: returns subscriber counts, plan breakdown, document volume, recent users.';

-- ============================================================
-- Full user list for /admin/users (paginated, admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_admin_users_list(
  _limit  INT DEFAULT 50,
  _offset INT DEFAULT 0,
  _search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO _is_admin;

  IF NOT _is_admin THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  RETURN jsonb_build_object(
    'total', (
      SELECT COUNT(*)::int FROM auth.users
      WHERE _search IS NULL OR email ILIKE '%' || _search || '%'
    ),
    'users', (
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          u.id,
          u.email,
          u.created_at,
          u.last_sign_in_at,
          u.email_confirmed_at,
          us.plan_type,
          us.subscription_status,
          us.stripe_customer_id,
          us.free_trial_docs_used,
          us.prepaid_basic_credits,
          us.prepaid_pro_credits,
          us.documents_per_month,
          (SELECT COUNT(*)::int FROM public.documents d WHERE d.user_id = u.id) AS doc_count
        FROM auth.users u
        LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
        WHERE _search IS NULL OR u.email ILIKE '%' || _search || '%'
        ORDER BY u.created_at DESC
        LIMIT _limit OFFSET _offset
      ) t
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_users_list(INT, INT, TEXT) IS
  'Admin only: paginated user list with subscription data.';
