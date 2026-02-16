-- Fix: Add UPDATE policy for analysis_feedback to support upsert operations
-- The previous migration only had INSERT and SELECT policies

-- Add UPDATE policy for users to update their own feedback
CREATE POLICY IF NOT EXISTS "Users can update their own feedback"
  ON public.analysis_feedback
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also add DELETE policy in case user wants to remove their feedback
CREATE POLICY IF NOT EXISTS "Users can delete their own feedback"
  ON public.analysis_feedback
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
