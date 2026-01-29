import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Scenario, CreateScenario } from '@/lib/types';

export function useScenarios(dealId: string | undefined) {
  return useQuery({
    queryKey: ['scenarios', dealId],
    queryFn: async () => {
      if (!dealId) throw new Error('Deal ID is required');
      
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('deal_id', dealId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as Scenario[];
    },
    enabled: !!dealId,
    staleTime: 30000,
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scenario: CreateScenario) => {
      const { data, error } = await supabase
        .from('scenarios')
        .insert(scenario)
        .select()
        .single();

      if (error) throw error;
      return data as Scenario;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', data.deal_id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal', data.deal_id] });
    },
  });
}

export function useUpdateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Scenario> }) => {
      const { data, error } = await supabase
        .from('scenarios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Scenario;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', data.deal_id] });
    },
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dealId }: { id: string; dealId: string }) => {
      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, dealId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', data.dealId] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal', data.dealId] });
    },
  });
}
