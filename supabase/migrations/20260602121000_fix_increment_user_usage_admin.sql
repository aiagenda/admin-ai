-- Restore increment_user_usage body; keep admin no-op at start.
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
