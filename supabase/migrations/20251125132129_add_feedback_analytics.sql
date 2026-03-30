-- Create analysis_feedback table for user feedback
CREATE TABLE IF NOT EXISTS public.analysis_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'confusing')),
  summary_type TEXT CHECK (summary_type IN ('simple', 'detailed')),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(analysis_id, user_id)
);

-- Create tab_view_analytics table for tracking tab views
CREATE TABLE IF NOT EXISTS public.tab_view_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tab_type TEXT NOT NULL CHECK (tab_type IN ('simple', 'detailed')),
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.analysis_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_view_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analysis_feedback
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.analysis_feedback;
CREATE POLICY "Users can insert their own feedback"
  ON public.analysis_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.analysis_feedback;
CREATE POLICY "Users can view their own feedback"
  ON public.analysis_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for tab_view_analytics
DROP POLICY IF EXISTS "Users can insert their own tab views" ON public.tab_view_analytics;
CREATE POLICY "Users can insert their own tab views"
  ON public.tab_view_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can view their own tab views" ON public.tab_view_analytics;
CREATE POLICY "Users can view their own tab views"
  ON public.tab_view_analytics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Admin can view all feedback and analytics
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.analysis_feedback;
CREATE POLICY "Admins can view all feedback"
  ON public.analysis_feedback
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all tab analytics" ON public.tab_view_analytics;
CREATE POLICY "Admins can view all tab analytics"
  ON public.tab_view_analytics
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analysis_feedback_analysis_id ON public.analysis_feedback(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_feedback_user_id ON public.analysis_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_feedback_created_at ON public.analysis_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_tab_view_analytics_analysis_id ON public.tab_view_analytics(analysis_id);
CREATE INDEX IF NOT EXISTS idx_tab_view_analytics_tab_type ON public.tab_view_analytics(tab_type);
CREATE INDEX IF NOT EXISTS idx_tab_view_analytics_viewed_at ON public.tab_view_analytics(viewed_at);

