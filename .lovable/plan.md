
# Implementation Plan: Deal Deletion and Admin Dashboard

## Overview
This plan adds two major features:
1. **Deal deletion** on the main Deals page with confirmation dialog
2. **Admin dashboard** accessible only to yagnavudathu@gmail.com with comprehensive user analytics, metrics, and deal visibility

---

## Part 1: Deal Deletion Feature

### Changes to DealCard Component
Add a delete button with dropdown menu to each deal card that:
- Shows a trash icon on hover or via a "more options" menu
- Prevents accidental clicks by stopping event propagation
- Triggers a confirmation dialog before deletion

### New Delete Confirmation Dialog
- Reusable confirmation dialog component
- Shows deal name being deleted
- Requires explicit confirmation
- Shows loading state during deletion

### Delete Hook
Create `useDeleteDeal` mutation hook in `useDeals.ts` that:
- Calls Supabase to delete the deal
- Cascading deletion is handled by database (scenarios and line_items)
- Invalidates the deals cache on success
- Shows success/error toast notifications

### UI Flow
```text
+------------------+     +------------------+     +-----------------+
| DealCard         | --> | Confirm Dialog   | --> | Delete & Toast  |
| [Trash Icon]     |     | "Delete Deal?"   |     | Refresh List    |
+------------------+     +------------------+     +-----------------+
```

---

## Part 2: Admin Dashboard

### New Files to Create

1. **`src/pages/Admin.tsx`** - Main admin dashboard page
2. **`src/pages/AdminUserDetail.tsx`** - Individual user detail view
3. **`src/hooks/useAdminAccess.ts`** - Check if user is yagnavudathu@gmail.com
4. **`src/hooks/useAdminUsers.ts`** - Fetch all users with metrics
5. **`src/hooks/useAdminUserDeals.ts`** - Fetch specific user's deals
6. **`src/components/admin/UserCard.tsx`** - User list item component
7. **`src/components/admin/UserMetricsCard.tsx`** - Metrics display component
8. **`src/components/admin/AdminHeader.tsx`** - Admin page header

### Database Changes Required

Create a new database function to allow admin to fetch all users and their metrics:

```sql
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

-- Create a view for admin to access user data (security definer function)
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
```

### Admin Dashboard Layout

```text
+-----------------------------------------------------------+
| Admin Dashboard                    yagnavudathu@gmail.com |
+-----------------------------------------------------------+
| Overview Stats                                             |
| +------------+ +------------+ +------------+ +-----------+ |
| | Total Users| | Active 24h | | Total Deals| | Scenarios | |
| |     3      | |     1      | |     6      | |    12     | |
| +------------+ +------------+ +------------+ +-----------+ |
+-----------------------------------------------------------+
| Users                                      [Search users] |
+-----------------------------------------------------------+
| +-------------------------------------------------------+ |
| | yagnavudathu@gmail.com                                | |
| | Joined: Jan 29 · Last login: 2h ago · 3 deals        | |
| | Provider: Google                            [View >]  | |
| +-------------------------------------------------------+ |
| +-------------------------------------------------------+ |
| | testuser@example.com                                  | |
| | Joined: Jan 29 · Last login: 1d ago · 2 deals        | |
| | Provider: Email                             [View >]  | |
| +-------------------------------------------------------+ |
+-----------------------------------------------------------+
```

### User Detail Page Layout

```text
+-----------------------------------------------------------+
| < Back to Users          testuser@example.com             |
+-----------------------------------------------------------+
| User Information                                           |
| +-------------------------------------------------------+ |
| | Email           | testuser@example.com                | |
| | User ID         | 80074ca4-4182-46c9-b12d-f1dedb40... | |
| | Provider        | Email                               | |
| | Joined          | January 29, 2026 at 5:10 AM         | |
| | Email Verified  | January 29, 2026                    | |
| | Last Sign In    | January 29, 2026 at 5:22 AM         | |
| +-------------------------------------------------------+ |
+-----------------------------------------------------------+
| Usage Metrics                                              |
| +------------+ +------------+ +------------+               |
| | Deals      | | Scenarios  | | Last Active|               |
| |     2      | |     5      | |   1d ago   |               |
| +------------+ +------------+ +------------+               |
+-----------------------------------------------------------+
| User's Deals                                               |
| +-------------------------------------------------------+ |
| | Acme Corp Deal                                        | |
| | Created: Jan 29 · Updated: Jan 29 · 2 scenarios       | |
| +-------------------------------------------------------+ |
| | Test Deal                                             | |
| | Created: Jan 29 · Updated: Jan 29 · 3 scenarios       | |
| +-------------------------------------------------------+ |
+-----------------------------------------------------------+
```

### Routing Updates in App.tsx
Add the admin routes:
```typescript
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminRoute>
        <Admin />
      </AdminRoute>
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/users/:userId"
  element={
    <ProtectedRoute>
      <AdminRoute>
        <AdminUserDetail />
      </AdminRoute>
    </ProtectedRoute>
  }
/>
```

### Admin Access Protection
Create `AdminRoute` component that:
- Checks if current user email is yagnavudathu@gmail.com
- Redirects to home page if not authorized
- Shows loading state while checking

### Header Updates (Deals.tsx)
For the admin user, show an "Admin" link in the header:
```text
Deal Scenario Calculator     [Admin] user@email.com [Sign Out]
```

---

## Technical Details

### Available User Metrics from auth.users
Based on the schema, we can display:
- **id**: User UUID
- **email**: User email address
- **created_at**: Account creation date
- **last_sign_in_at**: Most recent login timestamp
- **email_confirmed_at**: Email verification date
- **raw_app_meta_data.provider**: Auth provider (email/google)
- **raw_app_meta_data.providers**: Array of linked providers
- **raw_user_meta_data.full_name**: Name (if Google auth)
- **raw_user_meta_data.avatar_url**: Profile picture (if Google auth)

### Computed Metrics from deals table
- Deal count per user
- Total scenarios per user
- Last deal activity timestamp

### Note on IP/Location Data
Auth logs with IP information are not currently being captured in the analytics database. The admin dashboard will display all available metrics from auth.users and calculated metrics from deals. IP/location tracking would require additional Supabase configuration (auth hooks) which can be added as a future enhancement.

### File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/Admin.tsx` | Create | Main admin dashboard |
| `src/pages/AdminUserDetail.tsx` | Create | User detail view |
| `src/hooks/useAdminAccess.ts` | Create | Admin permission check |
| `src/hooks/useAdminUsers.ts` | Create | Fetch all users |
| `src/hooks/useAdminUserDeals.ts` | Create | Fetch user's deals |
| `src/components/admin/UserCard.tsx` | Create | User list item |
| `src/components/admin/UserMetricsCard.tsx` | Create | Metrics display |
| `src/components/admin/AdminHeader.tsx` | Create | Admin header |
| `src/components/admin/AdminRoute.tsx` | Create | Admin access gate |
| `src/components/deals/DealCard.tsx` | Modify | Add delete button |
| `src/components/deals/DealsList.tsx` | Modify | Pass delete handler |
| `src/hooks/useDeals.ts` | Modify | Add delete mutation |
| `src/pages/Deals.tsx` | Modify | Add delete dialog, admin link |
| `src/App.tsx` | Modify | Add admin routes |
| Database migration | Create | Admin functions |

---

## Security Considerations

1. **Admin functions use SECURITY DEFINER** - Runs with elevated privileges but validates caller
2. **Email-based admin check** - Only yagnavudathu@gmail.com can access admin features
3. **No client-side bypass** - All data access goes through server-side functions
4. **RLS maintained** - Regular users still can't access other users' data
5. **Deal deletion** - Uses existing RLS policies (users can only delete their own deals)
