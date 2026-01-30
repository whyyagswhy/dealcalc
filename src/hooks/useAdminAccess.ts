import { useAuth } from '@/contexts/AuthContext';
import { ADMIN } from '@/lib/constants';

export function useAdminAccess() {
  const { user, isLoading } = useAuth();
  
  const isAdmin = user?.email === ADMIN.EMAIL;
  
  return {
    isAdmin,
    isLoading,
  };
}
