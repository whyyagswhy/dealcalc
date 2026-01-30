import { formatDistanceToNow } from 'date-fns';
import { FileText, ChevronRight, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DealListItem } from '@/lib/types';

interface DealCardProps {
  deal: DealListItem;
  onClick: () => void;
  onDelete: (deal: DealListItem) => void;
}

export function DealCard({ deal, onClick, onDelete }: DealCardProps) {
  const updatedAgo = formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(deal);
  };

  return (
    <Card 
      className="cursor-pointer transition-colors hover:bg-accent/50 group"
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
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
