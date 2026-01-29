import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LineItem, CreateLineItem } from '@/lib/types';

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
      const { data, error } = await supabase
        .from('line_items')
        .update(updates)
        .eq('id', id)
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
