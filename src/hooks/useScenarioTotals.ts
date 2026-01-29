import { useMemo } from 'react';
import { 
  calculateScenarioTotals, 
  type ScenarioTotals 
} from '@/lib/calculations';
import type { LineItem } from '@/lib/types';

/**
 * Hook to compute aggregated totals for a scenario's line items
 * Memoized to prevent unnecessary recalculations
 */
export function useScenarioTotals(lineItems: LineItem[]): ScenarioTotals {
  return useMemo(() => calculateScenarioTotals(lineItems), [lineItems]);
}
