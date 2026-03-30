-- Ensure app_role enum exists
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ensure user_roles table exists with correct structure
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can assign roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can remove roles" ON public.user_roles;

-- Create has_role function if not exists
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
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

-- Create is_admin RPC function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

-- Create bootstrap_admin RPC function
CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
  current_user_id uuid;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Count existing admins
  SELECT COUNT(*) INTO admin_count
  FROM public.user_roles
  WHERE role = 'admin'::public.app_role;
  
  -- If no admins exist, make current user admin
  IF admin_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (current_user_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Return whether current user is now admin
  RETURN public.has_role(current_user_id, 'admin'::public.app_role);
END;
$$;

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only admins can assign roles" ON public.user_roles;
CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can remove roles" ON public.user_roles;
CREATE POLICY "Only admins can remove roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Ensure forms table RLS policies are correct
DROP POLICY IF EXISTS "Forms are viewable by everyone" ON public.forms;
DROP POLICY IF EXISTS "Only admins can insert forms" ON public.forms;
DROP POLICY IF EXISTS "Only admins can update forms" ON public.forms;
DROP POLICY IF EXISTS "Only admins can delete forms" ON public.forms;

DROP POLICY IF EXISTS "Forms are viewable by everyone" ON public.forms;
CREATE POLICY "Forms are viewable by everyone"
ON public.forms
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Only admins can insert forms" ON public.forms;
CREATE POLICY "Only admins can insert forms"
ON public.forms
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can update forms" ON public.forms;
CREATE POLICY "Only admins can update forms"
ON public.forms
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Only admins can delete forms" ON public.forms;
CREATE POLICY "Only admins can delete forms"
ON public.forms
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Ensure analyses table RLS policies are correct
DROP POLICY IF EXISTS "Users can view analyses of their documents" ON public.analyses;
DROP POLICY IF EXISTS "Service role can create analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can update analyses of their documents" ON public.analyses;
DROP POLICY IF EXISTS "Users can delete analyses of their documents" ON public.analyses;

DROP POLICY IF EXISTS "Users can view analyses of their documents" ON public.analyses;
CREATE POLICY "Users can view analyses of their documents"
ON public.analyses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = analyses.document_id
    AND documents.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Service role can create analyses" ON public.analyses;
CREATE POLICY "Service role can create analyses"
ON public.analyses
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update analyses of their documents" ON public.analyses;
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

DROP POLICY IF EXISTS "Users can delete analyses of their documents" ON public.analyses;
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