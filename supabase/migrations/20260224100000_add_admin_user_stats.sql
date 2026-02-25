-- Admin-only: regisztrált és aktív felhasználók száma (auth.users) – Analitika dashboardhoz
-- Csak admin hívhatja (user_roles.role = 'admin').

CREATE OR REPLACE FUNCTION public.get_admin_user_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  is_admin BOOLEAN;
  registered BIGINT;
  active_30d BIGINT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') INTO is_admin;
  IF NOT is_admin THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT count(*)::BIGINT INTO registered FROM auth.users;

  SELECT count(*)::BIGINT INTO active_30d
  FROM auth.users
  WHERE last_sign_in_at IS NOT NULL
    AND last_sign_in_at >= (now() - interval '30 days');

  RETURN jsonb_build_object(
    'registered', registered,
    'active_30d', active_30d
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_user_stats() IS 'Admin only: returns registered user count and active (signed in last 30d) for analytics.';
