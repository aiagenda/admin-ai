-- Create user_profiles table for storing user preferences and accountant settings
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  accountant_email TEXT,
  accountant_auto_send_enabled BOOLEAN DEFAULT false,
  accountant_auto_send_day INTEGER CHECK (accountant_auto_send_day >= 1 AND accountant_auto_send_day <= 31),
  accountant_export_format TEXT DEFAULT 'csv' CHECK (accountant_export_format IN ('csv', 'excel')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Function to get or create user profile
CREATE OR REPLACE FUNCTION public.get_user_profile(_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  accountant_email TEXT,
  accountant_auto_send_enabled BOOLEAN,
  accountant_auto_send_day INTEGER,
  accountant_export_format TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- Try to get existing profile
  SELECT * INTO profile_record
  FROM public.user_profiles
  WHERE user_id = _user_id;

  -- If no profile exists, create default one
  IF NOT FOUND THEN
    INSERT INTO public.user_profiles (user_id, accountant_export_format)
    VALUES (_user_id, 'csv')
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO profile_record;
  END IF;

  -- Return profile details
  RETURN QUERY
  SELECT 
    profile_record.id,
    profile_record.user_id,
    profile_record.accountant_email,
    profile_record.accountant_auto_send_enabled,
    profile_record.accountant_auto_send_day,
    profile_record.accountant_export_format,
    profile_record.created_at,
    profile_record.updated_at;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_profile_updated_at();
