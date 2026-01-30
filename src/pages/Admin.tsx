import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Users, FileText, Layers, Clock, Loader2, Search } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { UserCard } from '@/components/admin/UserCard';
import { UserMetricsCard } from '@/components/admin/UserMetricsCard';
import { SearchInput } from '@/components/deals/SearchInput';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useDebounce } from '@/hooks/useDebounce';

export default function Admin() {
  const navigate = useNavigate();
  const { data: users, isLoading, isError, refetch } = useAdminUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!debouncedSearch.trim()) return users;
    
    const query = debouncedSearch.toLowerCase();
    return users.filter(user => 
      user.email.toLowerCase().includes(query) ||
      ((user.raw_user_meta_data as Record<string, unknown>)?.full_name as string)?.toLowerCase().includes(query)
    );
  }, [users, debouncedSearch]);

  const stats = useMemo(() => {
    if (!users) return { totalUsers: 0, activeToday: 0, totalDeals: 0, totalScenarios: 0 };
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return {
      totalUsers: users.length,
      activeToday: users.filter(u => 
        u.last_sign_in_at && new Date(u.last_sign_in_at) > oneDayAgo
      ).length,
      totalDeals: users.reduce((sum, u) => sum + (u.deal_count || 0), 0),
      totalScenarios: users.reduce((sum, u) => sum + (u.scenario_count || 0), 0),
    };
  }, [users]);

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="Admin Dashboard" />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {/* Overview Stats */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Overview</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <UserMetricsCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
            />
            <UserMetricsCard
              title="Active (24h)"
              value={stats.activeToday}
              icon={Clock}
            />
            <UserMetricsCard
              title="Total Deals"
              value={stats.totalDeals}
              icon={FileText}
            />
            <UserMetricsCard
              title="Total Scenarios"
              value={stats.totalScenarios}
              icon={Layers}
            />
          </div>
        </div>

        {/* Users Section */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-foreground">Users</h2>
            <div className="w-full sm:max-w-xs">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search users..."
              />
            </div>
          </div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="mb-4 text-destructive">Failed to load users</p>
              <button
                onClick={() => refetch()}
                className="text-primary hover:underline"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && !isError && filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">
                {searchQuery ? 'No users found' : 'No users yet'}
              </p>
              {searchQuery && (
                <p className="text-muted-foreground">
                  No users match "{searchQuery}"
                </p>
              )}
            </div>
          )}

          {!isLoading && !isError && filteredUsers.length > 0 && (
            <div className="space-y-3">
              {filteredUsers.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
