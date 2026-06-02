-- Admins bypass upload quota (trial, prepaid, and subscription caps).
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
  IF public.has_role(_user_id, 'admin'::public.app_role) THEN
    usage_count := public.get_current_month_usage(_user_id);
    RETURN QUERY
    SELECT true, usage_count, 9999, 'admin'::text, 0, 0;
    RETURN;
  END IF;

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

  IF COALESCE(pp, 0) > 0 OR COALESCE(pb, 0) > 0 THEN
    RETURN QUERY
    SELECT true, usage_count, cap, p, COALESCE(pb, 0), COALESCE(pp, 0);
    RETURN;
  END IF;

  IF p = 'free' AND COALESCE(f_used, 0) < 1 THEN
    RETURN QUERY SELECT true, f_used, 1, p, 0, 0;
    RETURN;
  END IF;

  IF p = 'free' AND COALESCE(f_used, 0) >= 1 THEN
    RETURN QUERY SELECT false, usage_count, 1, p, 0, 0;
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
  IF public.has_role(_user_id, 'admin'::public.app_role) THEN
    RETURN true;
  END IF;

  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);

  SELECT us.plan_type, us.documents_per_month, us.free_trial_docs_used, us.prepaid_basic_credits, us.prepaid_pro_credits
  INTO p, dpm, f_used, pb, pp
  FROM public.user_subscriptions us
  WHERE us.user_id = _user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF COALESCE(pp, 0) > 0 THEN
    UPDATE public.user_subscriptions
    SET prepaid_pro_credits = prepaid_pro_credits - 1, updated_at = now()
    WHERE user_id = _user_id;
    RETURN true;
  END IF;

  IF COALESCE(pb, 0) > 0 THEN
    UPDATE public.user_subscriptions
    SET prepaid_basic_credits = prepaid_basic_credits - 1, updated_at = now()
    WHERE user_id = _user_id;
    RETURN true;
  END IF;

  IF p = 'free' AND COALESCE(f_used, 0) < 1 THEN
    UPDATE public.user_subscriptions
    SET free_trial_docs_used = free_trial_docs_used + 1, updated_at = now()
    WHERE user_id = _user_id;
    RETURN true;
  END IF;

  INSERT INTO public.usage_tracking (user_id, year, month, documents_count)
  VALUES (_user_id, current_year, current_month, 1)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET documents_count = usage_tracking.documents_count + 1, updated_at = now();

  RETURN true;
END;
$$;
