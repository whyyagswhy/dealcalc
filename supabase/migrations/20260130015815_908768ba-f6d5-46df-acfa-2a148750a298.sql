-- Create an enum for application roles
CREATE TYPE public.app_role AS ENUM ('admin', 'sales_rep', 'viewer');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only admins can manage roles (we'll use a security definer function)
CREATE POLICY "No direct insert to user_roles"
ON public.user_roles
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct update to user_roles"
ON public.user_roles
FOR UPDATE
USING (false);

CREATE POLICY "No direct delete from user_roles"
ON public.user_roles
FOR DELETE
USING (false);

-- Create security definer function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- Create function to check if user has any sales role (admin or sales_rep)
CREATE OR REPLACE FUNCTION public.has_sales_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'sales_rep')
  )
$$;

-- Drop the existing permissive policy on discount_thresholds
DROP POLICY IF EXISTS "Authenticated users can read discount thresholds" ON public.discount_thresholds;

-- Create new restrictive policy that only allows sales roles
CREATE POLICY "Sales roles can read discount thresholds"
ON public.discount_thresholds
FOR SELECT
TO authenticated
USING (public.has_sales_access(auth.uid()));