import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface UserMetricsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
}

export function UserMetricsCard({ title, value, icon: Icon, description }: UserMetricsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
