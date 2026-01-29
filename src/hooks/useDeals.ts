import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DealListItem } from '@/lib/types';

const PAGE_SIZE = 20;

interface UseDealsOptions {
  searchQuery?: string;
}

interface DealsPage {
  deals: DealListItem[];
  nextCursor: number | null;
}

async function fetchDeals({ 
  pageParam = 0, 
  searchQuery = '' 
}: { 
  pageParam: number; 
  searchQuery: string;
}): Promise<DealsPage> {
  let query = supabase
    .from('deals')
    .select('id, name, updated_at, scenario_count')
    .order('updated_at', { ascending: false })
    .range(pageParam, pageParam + PAGE_SIZE - 1);

  if (searchQuery.trim()) {
    query = query.ilike('name', `%${searchQuery.trim()}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  return {
    deals: (data || []) as DealListItem[],
    nextCursor: data && data.length === PAGE_SIZE ? pageParam + PAGE_SIZE : null,
  };
}

export function useDeals({ searchQuery = '' }: UseDealsOptions = {}) {
  return useInfiniteQuery({
    queryKey: ['deals', searchQuery],
    queryFn: ({ pageParam }) => fetchDeals({ pageParam, searchQuery }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    staleTime: 30000, // 30 seconds
  });
}

export function useInvalidateDeals() {
  const queryClient = require('@tanstack/react-query').useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['deals'] });
}
