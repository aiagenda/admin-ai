-- Create user_subscriptions table to store plan/limit information
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  documents_per_month INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_usage_stats table to track monthly usage
CREATE TABLE IF NOT EXISTS public.user_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  documents_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, year, month)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can update their own subscription"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_usage_stats
DROP POLICY IF EXISTS "Users can view their own usage stats" ON public.user_usage_stats;
CREATE POLICY "Users can view their own usage stats"
  ON public.user_usage_stats FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert usage stats" ON public.user_usage_stats;
CREATE POLICY "System can insert usage stats"
  ON public.user_usage_stats FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update usage stats" ON public.user_usage_stats;
CREATE POLICY "System can update usage stats"
  ON public.user_usage_stats FOR UPDATE
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_user_id ON public.user_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_user_year_month ON public.user_usage_stats(user_id, year, month);

-- Function to get or create user subscription (defaults to free plan)
CREATE OR REPLACE FUNCTION public.get_user_subscription(_user_id UUID)
RETURNS TABLE (
  plan_type TEXT,
  documents_per_month INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_record RECORD;
BEGIN
  -- Try to get existing subscription
  SELECT * INTO sub_record
  FROM public.user_subscriptions
  WHERE user_id = _user_id;

  -- If no subscription exists, create default free plan
  IF NOT FOUND THEN
    INSERT INTO public.user_subscriptions (user_id, plan_type, documents_per_month)
    VALUES (_user_id, 'free', 10)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO sub_record;
  END IF;

  -- Return subscription details
  RETURN QUERY
  SELECT 
    sub_record.plan_type,
    sub_record.documents_per_month;
END;
$$;

-- Function to get current month usage
CREATE OR REPLACE FUNCTION public.get_current_month_usage(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER;
  current_month INTEGER;
  usage_count INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);

  SELECT COALESCE(documents_count, 0) INTO usage_count
  FROM public.user_usage_stats
  WHERE user_id = _user_id
    AND year = current_year
    AND month = current_month;

  RETURN COALESCE(usage_count, 0);
END;
$$;

-- Function to increment usage (called when document is uploaded)
CREATE OR REPLACE FUNCTION public.increment_user_usage(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER;
  current_month INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);

  INSERT INTO public.user_usage_stats (user_id, year, month, documents_count)
  VALUES (_user_id, current_year, current_month, 1)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    documents_count = user_usage_stats.documents_count + 1,
    updated_at = now();

  RETURN TRUE;
END;
$$;

-- Function to check if user can upload (quota check)
CREATE OR REPLACE FUNCTION public.can_user_upload(_user_id UUID)
RETURNS TABLE (
  can_upload BOOLEAN,
  current_usage INTEGER,
  limit_amount INTEGER,
  plan_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_record RECORD;
  usage_count INTEGER;
BEGIN
  -- Get subscription
  SELECT * INTO sub_record FROM public.get_user_subscription(_user_id) AS sub;

  -- Get current usage
  usage_count := public.get_current_month_usage(_user_id);

  -- Check if user can upload
  RETURN QUERY
  SELECT
    (usage_count < sub_record.documents_per_month) AS can_upload,
    usage_count AS current_usage,
    sub_record.documents_per_month AS limit_amount,
    sub_record.plan_type;
END;
$$;

-- Initialize default subscriptions for existing users
INSERT INTO public.user_subscriptions (user_id, plan_type, documents_per_month)
SELECT id, 'free', 10
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;

