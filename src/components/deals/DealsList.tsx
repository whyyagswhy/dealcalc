import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { DealCard } from './DealCard';
import type { DealListItem } from '@/lib/types';

interface DealsListProps {
  deals: DealListItem[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onDelete: (deal: DealListItem) => void;
}

export function DealsList({ 
  deals, 
  hasNextPage, 
  isFetchingNextPage, 
  fetchNextPage,
  onDelete,
}: DealsListProps) {
  const navigate = useNavigate();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: deals.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated height of DealCard
    overscan: 5,
  });

  const items = virtualizer.getVirtualItems();
  const lastItem = items[items.length - 1];

  // Infinite scroll trigger
  useEffect(() => {
    if (!lastItem) return;
    
    if (
      lastItem.index >= deals.length - 5 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [lastItem, deals.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div 
      ref={parentRef} 
      className="h-[calc(100vh-200px)] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualItem) => {
          const deal = deals[virtualItem.index];
          return (
            <div
              key={deal.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="pb-2"
            >
              <DealCard
                deal={deal}
                onClick={() => navigate(`/deals/${deal.id}`)}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
      
      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
