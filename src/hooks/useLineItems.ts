import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LineItem, CreateLineItem } from '@/lib/types';
import { validateLineItemUpdate } from '@/lib/validations';

export function useLineItems(scenarioId: string | undefined) {
  return useQuery({
    queryKey: ['lineItems', scenarioId],
    queryFn: async () => {
      if (!scenarioId) throw new Error('Scenario ID is required');
      
      const { data, error } = await supabase
        .from('line_items')
        .select('*')
        .eq('scenario_id', scenarioId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as LineItem[];
    },
    enabled: !!scenarioId,
    staleTime: 30000,
  });
}

export function useCreateLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineItem: CreateLineItem) => {
      // Validate numeric fields before submission
      const validation = validateLineItemUpdate({
        product_name: lineItem.product_name,
        list_unit_price: lineItem.list_unit_price,
        quantity: lineItem.quantity,
        term_months: lineItem.term_months ?? 12,
        discount_percent: lineItem.discount_percent,
        net_unit_price: lineItem.net_unit_price,
        revenue_type: lineItem.revenue_type,
      });

      if (!validation.success) {
        throw new Error(validation.errors?.join(', ') || 'Invalid line item data');
      }

      const { data, error } = await supabase
        .from('line_items')
        .insert(lineItem)
        .select()
        .single();

      if (error) throw error;
      return data as LineItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lineItems', data.scenario_id] });
    },
  });
}

export function useUpdateLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LineItem> }) => {
      // Validate updates before submission
      const validation = validateLineItemUpdate(updates);
      if (!validation.success) {
        throw new Error(validation.errors?.join(', ') || 'Invalid line item data');
      }

      const { data, error } = await supabase
        .from('line_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LineItem;
    },
    onMutate: async ({ id, updates }) => {
      // Get the scenario ID from the update or find it in existing data
      const queries = queryClient.getQueriesData<LineItem[]>({ queryKey: ['lineItems'] });
      let scenarioId: string | undefined;
      
      for (const [, data] of queries) {
        const item = data?.find(li => li.id === id);
        if (item) {
          scenarioId = item.scenario_id;
          break;
        }
      }
      
      if (scenarioId) {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['lineItems', scenarioId] });
        
        // Optimistically update the cache
        queryClient.setQueryData<LineItem[]>(['lineItems', scenarioId], (old) => {
          if (!old) return old;
          return old.map(item => 
            item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item
          );
        });
      }
      
      return { scenarioId };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error by refetching
      if (context?.scenarioId) {
        queryClient.invalidateQueries({ queryKey: ['lineItems', context.scenarioId] });
      }
    },
    // Don't invalidate on success - we already updated optimistically
    onSuccess: () => {
      // No-op: optimistic update already applied
    },
  });
}

export function useDeleteLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, scenarioId }: { id: string; scenarioId: string }) => {
      const { error } = await supabase
        .from('line_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, scenarioId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lineItems', data.scenarioId] });
    },
  });
}

export function useBatchUpsertLineItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scenarioId, lineItems }: { scenarioId: string; lineItems: LineItem[] }) => {
      const { data, error } = await supabase
        .from('line_items')
        .upsert(lineItems.map(item => ({
          ...item,
          scenario_id: scenarioId,
        })))
        .select();

      if (error) throw error;
      return data as LineItem[];
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lineItems', variables.scenarioId] });
    },
  });
}

export function useCloneLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lineItem, targetScenarioId }: { lineItem: LineItem; targetScenarioId: string }) => {
      const { id, created_at, updated_at, ...rest } = lineItem;
      const { data, error } = await supabase
        .from('line_items')
        .insert({
          ...rest,
          scenario_id: targetScenarioId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LineItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lineItems', data.scenario_id] });
    },
  });
}
