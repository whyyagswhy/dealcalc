import { ShieldX, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
}

export function AccessDenied({ 
  title = "Access Denied",
  message = "You don't have permission to view pricing data. Sales access is required to use this feature.",
  showBackButton = true
}: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-6 max-w-md text-center px-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="h-10 w-10 text-destructive" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{message}</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sales access is granted to:
          </p>
          <ul className="text-sm text-muted-foreground list-disc list-inside text-left">
            <li>Users with @salesforce.com email addresses</li>
            <li>Users assigned the sales_rep or admin role</li>
          </ul>
        </div>

        {showBackButton && (
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="mt-2"
          >
            Go to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
