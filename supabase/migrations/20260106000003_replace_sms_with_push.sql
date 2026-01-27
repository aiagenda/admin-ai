-- Migration: Replace SMS with Push Notifications
-- ============================================
-- This migration replaces SMS notification fields with Push Notification fields

-- Drop SMS columns from notification_preferences
ALTER TABLE public.notification_preferences 
  DROP COLUMN IF EXISTS sms_enabled,
  DROP COLUMN IF EXISTS sms_phone_number,
  DROP COLUMN IF EXISTS sms_7_days_before,
  DROP COLUMN IF EXISTS sms_3_days_before,
  DROP COLUMN IF EXISTS sms_1_day_before,
  DROP COLUMN IF EXISTS sms_on_deadline;

-- Add Push Notification columns
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_7_days_before BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_3_days_before BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_1_day_before BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_on_deadline BOOLEAN DEFAULT false;

-- Create push_subscriptions table for storing user push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;

-- RLS policies
CREATE POLICY "Users can manage their own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- ⚠️ FONTOS: Először törölni kell a régi függvényt, mert a return type változott
DROP FUNCTION IF EXISTS public.get_notification_preferences(UUID);

-- Update get_notification_preferences function to return push fields instead of SMS
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
  -- Try to get existing preferences
  SELECT * INTO prefs_record
  FROM public.notification_preferences
  WHERE user_id = _user_id;

  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO prefs_record;
  END IF;

  -- Return preferences
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
