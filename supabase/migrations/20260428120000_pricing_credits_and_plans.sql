-- Pricing v2: 1 free trial doc, prepaid basic/pro doc credits, monthly(10) / business(50) / enterprise
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS free_trial_docs_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prepaid_basic_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prepaid_pro_credits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT;

ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_plan_type_check;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_plan_type_check
  CHECK (plan_type IN (
    'free', 'pro', 'basic', 'monthly', 'business', 'enterprise'
  ));

-- Existing free users who already uploaded: mark trial consumed
UPDATE public.user_subscriptions u
SET free_trial_docs_used = 1
FROM (
  SELECT d.user_id, COUNT(*)::int AS c
  FROM public.documents d
  GROUP BY d.user_id
) t
WHERE u.user_id = t.user_id
  AND u.plan_type = 'free'
  AND t.c > 0
  AND u.free_trial_docs_used = 0;

-- Old free tier defaulted to 10/mo; new free uses trial + credits, not a monthly sub quota
UPDATE public.user_subscriptions
SET documents_per_month = 0
WHERE plan_type = 'free' AND documents_per_month = 10;

-- -----------------------------------------------------------------------------
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
  p TEXT;
  dpm INTEGER;
BEGIN
  SELECT us.plan_type, us.documents_per_month
  INTO p, dpm
  FROM public.user_subscriptions us
  WHERE us.user_id = _user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_subscriptions (user_id, plan_type, documents_per_month, free_trial_docs_used, prepaid_basic_credits, prepaid_pro_credits)
    VALUES (_user_id, 'free', 0, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT us.plan_type, us.documents_per_month
    INTO p, dpm
    FROM public.user_subscriptions us
    WHERE us.user_id = _user_id;
  END IF;

  RETURN QUERY SELECT p, dpm;
END;
$$;

-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_user_upload(_user_id UUID)
RETURNS TABLE (
  can_upload BOOLEAN,
  current_usage INTEGER,
  limit_amount INTEGER,
  plan_type TEXT,
  prepaid_basic_credits INTEGER,
  prepaid_pro_credits INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p TEXT;
  dpm INTEGER;
  f_used INTEGER;
  pb INTEGER;
  pp INTEGER;
  usage_count INTEGER;
  cap INTEGER;
BEGIN
  SELECT us.plan_type, us.documents_per_month, us.free_trial_docs_used, us.prepaid_basic_credits, us.prepaid_pro_credits
  INTO p, dpm, f_used, pb, pp
  FROM public.user_subscriptions us
  WHERE us.user_id = _user_id;

  IF NOT FOUND THEN
    PERFORM public.get_user_subscription(_user_id);
    SELECT us.plan_type, us.documents_per_month, us.free_trial_docs_used, us.prepaid_basic_credits, us.prepaid_pro_credits
    INTO p, dpm, f_used, pb, pp
    FROM public.user_subscriptions us
    WHERE us.user_id = _user_id;
  END IF;

  usage_count := public.get_current_month_usage(_user_id);

  cap := CASE
    WHEN p = 'free' THEN 0
    WHEN p IN ('monthly', 'basic') THEN 10
    WHEN p IN ('business', 'pro') THEN 50
    WHEN p = 'enterprise' THEN GREATEST(9999, COALESCE(dpm, 0))
    ELSE 10
  END;

  -- Prepaid one-shot credits always allow next upload
  IF COALESCE(pp, 0) > 0 OR COALESCE(pb, 0) > 0 THEN
    RETURN QUERY
    SELECT
      true,
      usage_count,
      cap,
      p,
      COALESCE(pb, 0),
      COALESCE(pp, 0);
    RETURN;
  END IF;

  -- Free: one trial document total
  IF p = 'free' AND COALESCE(f_used, 0) < 1 THEN
    RETURN QUERY
    SELECT
      true,
      f_used,
      1,
      p,
      0,
      0;
    RETURN;
  END IF;

  -- Subscriptions: calendar month cap
  IF p = 'free' AND COALESCE(f_used, 0) >= 1 THEN
    RETURN QUERY
    SELECT false, usage_count, 1, p, 0, 0;
    RETURN;
  END IF;

  IF p IN ('monthly', 'basic') AND usage_count < 10 THEN
    RETURN QUERY SELECT true, usage_count, 10, p, 0, 0;
    RETURN;
  END IF;

  IF p IN ('business', 'pro') AND usage_count < 50 THEN
    RETURN QUERY SELECT true, usage_count, 50, p, 0, 0;
    RETURN;
  END IF;

  IF p = 'enterprise' AND usage_count < cap THEN
    RETURN QUERY SELECT true, usage_count, cap, p, 0, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT false, usage_count, cap, p, COALESCE(pb, 0), COALESCE(pp, 0);
END;
$$;

-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_user_usage(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p TEXT;
  dpm INTEGER;
  f_used INTEGER;
  pb INTEGER;
  pp INTEGER;
  current_year INTEGER;
  current_month INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);

  SELECT us.plan_type, us.documents_per_month, us.free_trial_docs_used, us.prepaid_basic_credits, us.prepaid_pro_credits
  INTO p, dpm, f_used, pb, pp
  FROM public.user_subscriptions us
  WHERE us.user_id = _user_id
  ;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF COALESCE(pp, 0) > 0 THEN
    UPDATE public.user_subscriptions
    SET prepaid_pro_credits = prepaid_pro_credits - 1, updated_at = now()
    WHERE user_id = _user_id;
  ELSIF COALESCE(pb, 0) > 0 THEN
    UPDATE public.user_subscriptions
    SET prepaid_basic_credits = prepaid_basic_credits - 1, updated_at = now()
    WHERE user_id = _user_id;
  ELSIF p = 'free' AND COALESCE(f_used, 0) < 1 THEN
    UPDATE public.user_subscriptions
    SET free_trial_docs_used = 1, updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  INSERT INTO public.user_usage_stats (user_id, year, month, documents_count)
  VALUES (_user_id, current_year, current_month, 1)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    documents_count = public.user_usage_stats.documents_count + 1,
    updated_at = now();

  RETURN true;
END;
$$;
