import { useLineItems } from '@/hooks/useLineItems';
import { calculateScenarioTotals } from '@/lib/calculations';
import type { Scenario, DisplayMode } from '@/lib/types';

export interface ScenarioDataResult {
  scenario: Scenario;
  lineItems: ReturnType<typeof useLineItems>['data'];
  displayMode: DisplayMode;
  totals: ReturnType<typeof calculateScenarioTotals>;
}

interface ScenarioDataRowProps {
  scenario: Scenario;
  dealDisplayMode: DisplayMode;
  children: (data: ScenarioDataResult) => React.ReactNode;
}

/**
 * Component that properly calls useLineItems hook at the top level
 * and passes data to children via render prop pattern.
 * This fixes the React hooks rules violation in ScenarioComparison.
 */
export function ScenarioDataRow({ 
  scenario, 
  dealDisplayMode, 
  children 
}: ScenarioDataRowProps) {
  const { data: lineItems = [] } = useLineItems(scenario.id);
  const displayMode = scenario.display_override ?? dealDisplayMode;
  const totals = calculateScenarioTotals(lineItems);
  
  return <>{children({ scenario, lineItems, displayMode, totals })}</>;
}
