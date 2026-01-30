import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Home } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
}

export function AdminHeader({ title }: AdminHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-card shadow-card">
      <div className="mx-auto flex h-16 sm:h-20 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground">{title}</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="min-h-[44px]"
          >
            <Home className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Deals</span>
          </Button>
          <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut} className="min-h-[44px]">
            <LogOut className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
