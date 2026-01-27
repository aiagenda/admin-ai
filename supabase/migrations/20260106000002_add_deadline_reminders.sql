-- Create deadline_reminders table for tracking sent reminders
CREATE TABLE IF NOT EXISTS public.deadline_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Reminder details
  deadline_date DATE NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('7_days', '3_days', '1_day')),
  sent_at TIMESTAMPTZ,
  notification_method TEXT NOT NULL CHECK (notification_method IN ('email', 'sms', 'both')),
  email_sent BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Ensure we don't send duplicate reminders
  UNIQUE(analysis_id, reminder_type)
);

-- Enable RLS
ALTER TABLE public.deadline_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own deadline reminders"
  ON public.deadline_reminders FOR SELECT
  USING (auth.uid() = user_id);

-- System can manage all reminders (for scheduled jobs)
CREATE POLICY "System can manage deadline reminders"
  ON public.deadline_reminders FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_deadline_reminders_user_id ON public.deadline_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_deadline_reminders_deadline_date ON public.deadline_reminders(deadline_date);
CREATE INDEX IF NOT EXISTS idx_deadline_reminders_status ON public.deadline_reminders(status);
CREATE INDEX IF NOT EXISTS idx_deadline_reminders_reminder_type ON public.deadline_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_deadline_reminders_pending ON public.deadline_reminders(deadline_date, status, reminder_type) 
  WHERE status = 'pending';

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Email preferences
  email_enabled BOOLEAN DEFAULT true,
  email_7_days_before BOOLEAN DEFAULT true,
  email_3_days_before BOOLEAN DEFAULT true,
  email_1_day_before BOOLEAN DEFAULT true,
  email_on_deadline BOOLEAN DEFAULT false,
  
  -- SMS preferences
  sms_enabled BOOLEAN DEFAULT false,
  sms_phone_number TEXT, -- E.164 format (e.g., +36123456789)
  sms_7_days_before BOOLEAN DEFAULT false,
  sms_3_days_before BOOLEAN DEFAULT false,
  sms_1_day_before BOOLEAN DEFAULT true,
  sms_on_deadline BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- Function to get or create notification preferences
CREATE OR REPLACE FUNCTION public.get_notification_preferences(_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email_enabled BOOLEAN,
  email_7_days_before BOOLEAN,
  email_3_days_before BOOLEAN,
  email_1_day_before BOOLEAN,
  email_on_deadline BOOLEAN,
  sms_enabled BOOLEAN,
  sms_phone_number TEXT,
  sms_7_days_before BOOLEAN,
  sms_3_days_before BOOLEAN,
  sms_1_day_before BOOLEAN,
  sms_on_deadline BOOLEAN,
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
    prefs_record.sms_enabled,
    prefs_record.sms_phone_number,
    prefs_record.sms_7_days_before,
    prefs_record.sms_3_days_before,
    prefs_record.sms_1_day_before,
    prefs_record.sms_on_deadline,
    prefs_record.created_at,
    prefs_record.updated_at;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_preferences_updated_at();

CREATE TRIGGER deadline_reminders_updated_at
  BEFORE UPDATE ON public.deadline_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notification_preferences_updated_at();
