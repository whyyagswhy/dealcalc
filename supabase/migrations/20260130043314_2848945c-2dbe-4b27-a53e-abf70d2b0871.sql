-- Function to check if user is the admin
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
    AND email = 'yagnavudathu@gmail.com'
  )
$$;

-- Function for admin to access all users with metrics
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin(_admin_user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb,
  email_confirmed_at timestamptz,
  deal_count bigint,
  scenario_count bigint,
  last_deal_activity timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow the admin user to call this
  IF NOT is_admin_user(_admin_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    u.raw_user_meta_data,
    u.raw_app_meta_data,
    u.email_confirmed_at,
    COALESCE(d.deal_count, 0)::bigint as deal_count,
    COALESCE(d.scenario_count, 0)::bigint as scenario_count,
    d.last_deal_activity
  FROM auth.users u
  LEFT JOIN (
    SELECT 
      user_id,
      COUNT(*) as deal_count,
      SUM(scenario_count) as scenario_count,
      MAX(updated_at) as last_deal_activity
    FROM deals
    GROUP BY user_id
  ) d ON u.id = d.user_id
  ORDER BY u.created_at DESC;
END;
$$;

-- Function to get a specific user's deals for admin
CREATE OR REPLACE FUNCTION public.get_user_deals_for_admin(
  _admin_user_id uuid,
  _target_user_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  created_at timestamptz,
  updated_at timestamptz,
  scenario_count integer,
  display_mode text,
  view_mode text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_user(_admin_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.created_at,
    d.updated_at,
    d.scenario_count,
    d.display_mode,
    d.view_mode
  FROM deals d
  WHERE d.user_id = _target_user_id
  ORDER BY d.updated_at DESC;
END;
$$;