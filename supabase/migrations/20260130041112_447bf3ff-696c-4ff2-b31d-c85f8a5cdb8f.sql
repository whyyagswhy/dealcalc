-- Update has_sales_access to automatically grant access based on email domain or specific email
-- Users with @salesforce.com emails OR yagnavudathu@gmail.com get automatic access
-- Users with existing sales_rep or admin roles also get access

CREATE OR REPLACE FUNCTION public.has_sales_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    -- Check if user has admin or sales_rep role
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role IN ('admin', 'sales_rep')
    )
    OR
    -- Check if user email is @salesforce.com OR specific allowed email
    EXISTS (
      SELECT 1
      FROM auth.users
      WHERE id = _user_id
        AND (
          email LIKE '%@salesforce.com'
          OR email = 'yagnavudathu@gmail.com'
        )
    )
  )
$$;