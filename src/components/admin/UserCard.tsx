import { formatDistanceToNow, format } from 'date-fns';
import { ChevronRight, User, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { AdminUser } from '@/hooks/useAdminUsers';

interface UserCardProps {
  user: AdminUser;
  onClick: () => void;
}

export function UserCard({ user, onClick }: UserCardProps) {
  const joinedAgo = formatDistanceToNow(new Date(user.created_at), { addSuffix: true });
  const lastLoginAgo = user.last_sign_in_at
    ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
    : 'Never';

  const provider = (user.raw_app_meta_data as Record<string, unknown>)?.provider as string || 'email';
  const fullName = (user.raw_user_meta_data as Record<string, unknown>)?.full_name as string;
  const avatarUrl = (user.raw_user_meta_data as Record<string, unknown>)?.avatar_url as string;

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between p-5">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={avatarUrl} alt={fullName || user.email} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium text-foreground">
                {fullName || user.email}
              </h3>
              {fullName && (
                <span className="text-sm text-muted-foreground truncate">
                  ({user.email})
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Joined {joinedAgo} · Last login {lastLoginAgo} · {user.deal_count} deal{user.deal_count !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              Provider: {provider}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
