import { useParams, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  FileText,
  Layers,
  Clock,
  Mail,
  Calendar,
  Shield,
  User,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { UserMetricsCard } from '@/components/admin/UserMetricsCard';
import { useAdminUsers, AdminUser } from '@/hooks/useAdminUsers';
import { useAdminUserDeals } from '@/hooks/useAdminUserDeals';

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  
  const { data: users, isLoading: isLoadingUsers } = useAdminUsers();
  const { data: deals, isLoading: isLoadingDeals } = useAdminUserDeals(userId || '');

  const user = users?.find(u => u.id === userId);

  if (isLoadingUsers) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader title="User Details" />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <AdminHeader title="User Details" />
        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">User not found</p>
          </div>
        </main>
      </div>
    );
  }

  const fullName = (user.raw_user_meta_data as Record<string, unknown>)?.full_name as string;
  const avatarUrl = (user.raw_user_meta_data as Record<string, unknown>)?.avatar_url as string;
  const provider = (user.raw_app_meta_data as Record<string, unknown>)?.provider as string || 'email';
  const providers = (user.raw_app_meta_data as Record<string, unknown>)?.providers as string[] || [provider];

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return format(new Date(date), 'MMM d, yyyy \'at\' h:mm a');
  };

  const lastActiveAgo = user.last_deal_activity
    ? formatDistanceToNow(new Date(user.last_deal_activity), { addSuffix: true })
    : 'No activity';

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader title="User Details" />

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>

        {/* User Header */}
        <div className="mb-8 flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName || user.email}
              className="h-16 w-16 rounded-full"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              {fullName || user.email}
            </h2>
            {fullName && (
              <p className="text-muted-foreground">{user.email}</p>
            )}
          </div>
        </div>

        {/* User Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">User Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User ID</p>
                  <p className="text-foreground font-mono text-sm break-all">{user.id}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Auth Provider(s)</p>
                  <p className="text-foreground capitalize">{providers.join(', ')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Joined</p>
                  <p className="text-foreground">{formatDate(user.created_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email Verified</p>
                  <p className="text-foreground">
                    {user.email_confirmed_at ? formatDate(user.email_confirmed_at) : 'Not verified'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Last Sign In</p>
                  <p className="text-foreground">{formatDate(user.last_sign_in_at)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Metrics */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Usage Metrics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UserMetricsCard
              title="Deals"
              value={user.deal_count}
              icon={FileText}
            />
            <UserMetricsCard
              title="Scenarios"
              value={user.scenario_count}
              icon={Layers}
            />
            <UserMetricsCard
              title="Last Active"
              value={lastActiveAgo}
              icon={Clock}
            />
          </div>
        </div>

        {/* User's Deals */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">User's Deals</h3>
          
          {isLoadingDeals && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoadingDeals && (!deals || deals.length === 0) && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No deals found for this user</p>
              </CardContent>
            </Card>
          )}

          {!isLoadingDeals && deals && deals.length > 0 && (
            <div className="space-y-3">
              {deals.map(deal => (
                <Card key={deal.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-foreground truncate">{deal.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Created: {format(new Date(deal.created_at), 'MMM d, yyyy')} · 
                          Updated: {format(new Date(deal.updated_at), 'MMM d, yyyy')} · 
                          {deal.scenario_count} scenario{deal.scenario_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
