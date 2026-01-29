import { useMemo } from 'react';
import { 
  calculateLineItemTotals, 
  type LineItemTotals 
} from '@/lib/calculations';
import type { LineItem } from '@/lib/types';

/**
 * Hook to compute all derived values for a single line item
 * Memoized to prevent unnecessary recalculations
 */
export function useLineItemCalculations(lineItem: LineItem): LineItemTotals {
  return useMemo(() => calculateLineItemTotals(lineItem), [
    lineItem.list_unit_price,
    lineItem.quantity,
    lineItem.term_months,
    lineItem.discount_percent,
    lineItem.net_unit_price,
    lineItem.revenue_type,
    lineItem.existing_volume,
    lineItem.existing_net_price,
  ]);
}
