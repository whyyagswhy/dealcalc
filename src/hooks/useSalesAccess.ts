import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Check if the current user has sales access to view pricing data.
 * Access is granted if:
 * - User has admin or sales_rep role in user_roles table
 * - User email ends with @salesforce.com
 * - User email is yagnavudathu@gmail.com
 */
export function useSalesAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['sales-access', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      // First check email-based access (fastest check)
      const email = user.email?.toLowerCase() || '';
      if (email.endsWith('@salesforce.com') || email === 'yagnavudathu@gmail.com') {
        return true;
      }

      // Then check role-based access
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'sales_rep']);

      if (error) {
        // RLS might block access, but that's fine - they don't have access
        if (import.meta.env.DEV) {
          console.error('Error checking user roles:', error);
        }
        return false;
      }

      return (data?.length ?? 0) > 0;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: false, // Don't retry on permission errors
  });
}
