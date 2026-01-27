-- Safe migration script that handles existing policies
-- Run this if you got "policy already exists" errors

-- Drop policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.analysis_feedback;
DROP POLICY IF EXISTS "Users can view their own feedback" ON public.analysis_feedback;
DROP POLICY IF EXISTS "Users can insert their own tab views" ON public.tab_view_analytics;
DROP POLICY IF EXISTS "Users can view their own tab views" ON public.tab_view_analytics;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.analysis_feedback;
DROP POLICY IF EXISTS "Admins can view all tab analytics" ON public.tab_view_analytics;

-- Recreate policies
CREATE POLICY "Users can insert their own feedback"
  ON public.analysis_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedback"
  ON public.analysis_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tab views"
  ON public.tab_view_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own tab views"
  ON public.tab_view_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all feedback"
  ON public.analysis_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all tab analytics"
  ON public.tab_view_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

