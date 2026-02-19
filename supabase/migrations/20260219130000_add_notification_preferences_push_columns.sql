-- Ensure notification_preferences has all columns required by the app.
-- Run this if you see: Could not find the 'push_1_day_before' column (PGRST204).

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_7_days_before BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_3_days_before BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_1_day_before BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_on_deadline BOOLEAN DEFAULT false;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_7_days_before BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_3_days_before BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_1_day_before BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_on_deadline BOOLEAN DEFAULT false;
