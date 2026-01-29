import { formatDistanceToNow } from 'date-fns';
import { FileText, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { DealListItem } from '@/lib/types';

interface DealCardProps {
  deal: DealListItem;
  onClick: () => void;
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const updatedAgo = formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true });

  return (
    <Card 
      className="cursor-pointer transition-colors hover:bg-accent/50"
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between p-5 sm:p-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-medium text-foreground text-base sm:text-lg">{deal.name}</h3>
            <p className="text-sm text-muted-foreground">
              {deal.scenario_count} scenario{deal.scenario_count !== 1 ? 's' : ''} · Updated {updatedAgo}
            </p>
          </div>
        </div>
        <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
