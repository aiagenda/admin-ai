-- Create app_role enum for role-based access control
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles table
-- Everyone can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can insert new roles
CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete roles
CREATE POLICY "Only admins can remove roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix analyses table policies - restrict INSERT to service_role only
DROP POLICY IF EXISTS "System can create analyses" ON public.analyses;
CREATE POLICY "Service role can create analyses"
ON public.analyses
FOR INSERT
TO service_role
WITH CHECK (true);

-- Fix analyses UPDATE policy - verify document ownership
DROP POLICY IF EXISTS "System can update analyses" ON public.analyses;
CREATE POLICY "Users can update analyses of their documents"
ON public.analyses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = analyses.document_id
      AND documents.user_id = auth.uid()
  )
);

-- Add DELETE policy for analyses
CREATE POLICY "Users can delete analyses of their documents"
ON public.analyses
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = analyses.document_id
      AND documents.user_id = auth.uid()
  )
);

-- Add RLS policies for forms table (admin-only write access)
CREATE POLICY "Only admins can insert forms"
ON public.forms
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update forms"
ON public.forms
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete forms"
ON public.forms
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));