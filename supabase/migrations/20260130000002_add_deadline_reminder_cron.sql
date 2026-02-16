-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a cron job to send deadline reminders every day at 8:00 AM (Budapest time = 7:00 UTC)
SELECT cron.schedule(
  'send-deadline-reminders',
  '0 7 * * *', -- Every day at 7:00 UTC (8:00 Budapest time)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-deadline-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Alternative: Use pg_net extension for HTTP calls
-- First, enable the extension
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function that can be called by cron
CREATE OR REPLACE FUNCTION public.trigger_deadline_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _supabase_url text;
  _service_key text;
BEGIN
  -- Get settings from vault or environment
  SELECT decrypted_secret INTO _supabase_url 
  FROM vault.decrypted_secrets 
  WHERE name = 'SUPABASE_URL'
  LIMIT 1;
  
  SELECT decrypted_secret INTO _service_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;
  
  -- If vault not available, use hardcoded URL (for development)
  IF _supabase_url IS NULL THEN
    _supabase_url := 'https://kmtjturvfggqinamtarr.supabase.co';
  END IF;
  
  -- Make HTTP request to the edge function
  -- Note: This requires the pg_net extension and proper network configuration
  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/send-deadline-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  
  RAISE NOTICE 'Deadline reminders triggered at %', now();
END;
$$;
