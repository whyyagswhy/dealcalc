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

export function useCloneScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scenario, dealId }: { scenario: Scenario; dealId: string }) => {
      // First, get all line items for this scenario
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('line_items')
        .select('*')
        .eq('scenario_id', scenario.id);
      
      if (lineItemsError) throw lineItemsError;

      // Get the max position for the new scenario
      const { data: allScenarios } = await supabase
        .from('scenarios')
        .select('position')
        .eq('deal_id', dealId)
        .order('position', { ascending: false })
        .limit(1);
      
      const maxPosition = allScenarios?.[0]?.position ?? 0;

      // Create the new scenario with "(Copy)" suffix
      const { data: newScenario, error: scenarioError } = await supabase
        .from('scenarios')
        .insert({
          deal_id: dealId,
          name: `${scenario.name} (Copy)`,
          position: maxPosition + 1,
          display_override: scenario.display_override,
        })
        .select()
        .single();
      
      if (scenarioError) throw scenarioError;

      // Clone all line items to the new scenario
      if (lineItems && lineItems.length > 0) {
        const clonedLineItems = lineItems.map(({ id, created_at, updated_at, scenario_id, ...rest }) => ({
          ...rest,
          scenario_id: newScenario.id,
        }));
        
        const { error: insertError } = await supabase
          .from('line_items')
          .insert(clonedLineItems);
        
        if (insertError) throw insertError;
      }

      return newScenario as Scenario;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', data.deal_id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal', data.deal_id] });
    },
  });
}

export function useReorderScenarios() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ scenarios, dealId }: { scenarios: { id: string; position: number }[]; dealId: string }) => {
      // Update all scenarios with new positions
      const updates = scenarios.map(({ id, position }) => 
        supabase
          .from('scenarios')
          .update({ position })
          .eq('id', id)
      );
      
      await Promise.all(updates);
      return { dealId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scenarios', data.dealId] });
    },
  });
}
