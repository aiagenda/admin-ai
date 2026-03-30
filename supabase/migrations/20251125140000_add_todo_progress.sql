-- Create todo_progress table for tracking user todo completion
CREATE TABLE IF NOT EXISTS public.todo_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  todo_index INTEGER NOT NULL, -- Index of the todo in the array (0-based)
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(analysis_id, user_id, todo_index)
);

-- Enable RLS
ALTER TABLE public.todo_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own todo progress" ON public.todo_progress;
CREATE POLICY "Users can view their own todo progress"
  ON public.todo_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own todo progress" ON public.todo_progress;
CREATE POLICY "Users can insert their own todo progress"
  ON public.todo_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own todo progress" ON public.todo_progress;
CREATE POLICY "Users can update their own todo progress"
  ON public.todo_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_todo_progress_analysis_id ON public.todo_progress(analysis_id);
CREATE INDEX IF NOT EXISTS idx_todo_progress_user_id ON public.todo_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_todo_progress_completed ON public.todo_progress(completed);

