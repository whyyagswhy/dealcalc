import { useAuth } from '@/contexts/AuthContext';

const ADMIN_EMAIL = 'yagnavudathu@gmail.com';

export function useAdminAccess() {
  const { user, isLoading } = useAuth();
  
  const isAdmin = user?.email === ADMIN_EMAIL;
  
  return {
    isAdmin,
    isLoading,
  };
}
