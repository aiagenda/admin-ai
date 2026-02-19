-- Fix: ensure get_notification_preferences uses push_1_day_before (not push_2_day_before).
-- Run this if you see: Could not find the 'push_2_day_before' column of 'notification_preferences'.

DROP FUNCTION IF EXISTS public.get_notification_preferences(UUID);

CREATE OR REPLACE FUNCTION public.get_notification_preferences(_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email_enabled BOOLEAN,
  email_7_days_before BOOLEAN,
  email_3_days_before BOOLEAN,
  email_1_day_before BOOLEAN,
  email_on_deadline BOOLEAN,
  push_enabled BOOLEAN,
  push_7_days_before BOOLEAN,
  push_3_days_before BOOLEAN,
  push_1_day_before BOOLEAN,
  push_on_deadline BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefs_record RECORD;
BEGIN
  SELECT * INTO prefs_record
  FROM public.notification_preferences
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO prefs_record;
  END IF;

  RETURN QUERY
  SELECT
    prefs_record.id,
    prefs_record.user_id,
    prefs_record.email_enabled,
    prefs_record.email_7_days_before,
    prefs_record.email_3_days_before,
    prefs_record.email_1_day_before,
    prefs_record.email_on_deadline,
    prefs_record.push_enabled,
    prefs_record.push_7_days_before,
    prefs_record.push_3_days_before,
    prefs_record.push_1_day_before,
    prefs_record.push_on_deadline,
    prefs_record.created_at,
    prefs_record.updated_at;
END;
$$;
