import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QUERY_STALE_TIME } from '@/lib/constants';

export interface AdminUserDeal {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  scenario_count: number;
  display_mode: string;
  view_mode: string;
}

export function useAdminUserDeals(targetUserId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-user-deals', targetUserId],
    queryFn: async (): Promise<AdminUserDeal[]> => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('get_user_deals_for_admin', {
        _admin_user_id: user.id,
        _target_user_id: targetUserId,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Error fetching admin user deals:', error);
        }
        throw error;
      }

      return (data || []) as AdminUserDeal[];
    },
    enabled: !!user && !!targetUserId,
    staleTime: QUERY_STALE_TIME.SHORT,
    retry: (failureCount, error) => {
      if ((error as { code?: string })?.code === 'P0001') return false;
      return failureCount < 2;
    },
  });
}
