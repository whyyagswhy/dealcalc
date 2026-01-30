import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QUERY_STALE_TIME } from '@/lib/constants';

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  raw_user_meta_data: Record<string, unknown> | null;
  raw_app_meta_data: Record<string, unknown> | null;
  email_confirmed_at: string | null;
  deal_count: number;
  scenario_count: number;
  last_deal_activity: string | null;
}

export function useAdminUsers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async (): Promise<AdminUser[]> => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('get_all_users_for_admin', {
        _admin_user_id: user.id,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error fetching admin users:', error);
        }
        throw error;
      }

      return (data || []) as AdminUser[];
    },
    enabled: !!user,
    staleTime: QUERY_STALE_TIME.SHORT,
    retry: (failureCount, error) => {
      // Don't retry on permission errors
      if ((error as { code?: string })?.code === 'P0001') return false;
      return failureCount < 2;
    },
  });
}
