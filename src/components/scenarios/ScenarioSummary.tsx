import { useMemo } from 'react';
import { useScenarioTotals } from '@/hooks/useScenarioTotals';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import type { LineItem, DisplayMode, ViewMode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ScenarioSummaryProps {
  lineItems: LineItem[];
  displayMode: DisplayMode;
  viewMode: ViewMode;
  className?: string;
}

export function ScenarioSummary({ 
  lineItems, 
  displayMode, 
  viewMode,
  className 
}: ScenarioSummaryProps) {
  const totals = useScenarioTotals(lineItems);
  
  const isMonthly = displayMode === 'monthly';
  const isInternal = viewMode === 'internal';
  
  // Display values based on mode
  const displayList = isMonthly ? totals.listMonthly : totals.listAnnual;
  const displayNet = isMonthly ? totals.netMonthly : totals.netAnnual;
  const periodLabel = isMonthly ? '/mo' : '/yr';

  // Calculate weighted average term for all line items
  const avgTermMonths = useMemo(() => {
    if (lineItems.length === 0) return 12;
    const totalValue = lineItems.reduce((sum, item) => {
      const net = item.net_unit_price ?? item.list_unit_price;
      return sum + (net * item.quantity);
    }, 0);
    if (totalValue === 0) return 12;
    const weightedTerm = lineItems.reduce((sum, item) => {
      const net = item.net_unit_price ?? item.list_unit_price;
      const weight = (net * item.quantity) / totalValue;
      return sum + (item.term_months * weight);
    }, 0);
    return Math.round(weightedTerm);
  }, [lineItems]);

  // Show term savings only if average term > 12 months
  const showTermSavings = avgTermMonths > 12;

  if (lineItems.length === 0) {
    return null;
  }

  // Calculate grid columns: 
  // Customer view: 5-6 items (with/without term savings)
  // Internal view: 7-8 items (with/without term savings)
  const baseItems = isInternal ? 6 : 4;
  const itemCount = baseItems + (showTermSavings ? 2 : 1);
  
  return (
    <div 
      className={cn(
        "sticky top-0 z-10 rounded-lg p-4 sm:p-5",
        "bg-gradient-to-r from-[hsl(var(--grad-start))] to-[hsl(var(--grad-end))]",
        className
      )}
    >
      {/* Two-row layout for better readability */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        <KpiBlock label={`List${periodLabel}`} value={formatCurrency(displayList)} />
        <KpiBlock label={`Net${periodLabel}`} value={formatCurrency(displayNet)} />
        <KpiBlock label="Discount" value={formatPercent(totals.blendedDiscount)} />
        <KpiBlock label="Term Total" value={formatCurrency(totals.netTerm)} />
      </div>
      
      {isInternal && (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-3 pt-3 border-t border-white/20">
          <KpiBlock label="Comm. ACV" value={formatCurrency(totals.totalCommissionableACV)} />
          <KpiBlock label="Total ACV" value={formatCurrency(totals.totalACV)} />
        </div>
      )}
    </div>
  );
}

function KpiBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-[10px] sm:text-xs font-semibold text-white/80 uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <span className="text-lg sm:text-xl lg:text-2xl font-bold text-white tabular-nums whitespace-nowrap">
        {value}
      </span>
    </div>
  );
}
