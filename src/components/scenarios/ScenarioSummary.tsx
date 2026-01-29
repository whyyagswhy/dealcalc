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

  if (lineItems.length === 0) {
    return null;
  }

  // Calculate grid columns based on number of items
  const itemCount = isInternal ? 8 : 6;
  
  return (
    <div 
      className={cn(
        "sticky top-0 z-10 rounded-lg p-3 sm:p-4 lg:p-5",
        "bg-gradient-to-r from-[hsl(var(--grad-start))] to-[hsl(var(--grad-end))]",
        className
      )}
    >
      {/* Grid: 2 cols mobile, 3 cols sm for 6 items, 4 cols md+ for 8 items */}
      <div className={cn(
        "grid gap-x-2 gap-y-2 sm:gap-x-3 sm:gap-y-2",
        itemCount === 8 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"
      )}>
        <KpiBlock label={`List${periodLabel}`} value={formatCurrency(displayList)} />
        <KpiBlock label={`Net${periodLabel}`} value={formatCurrency(displayNet)} />
        <KpiBlock label="Term List" value={formatCurrency(totals.listTerm)} />
        <KpiBlock label="Term Net" value={formatCurrency(totals.netTerm)} />
        <KpiBlock label="Savings" value={formatCurrency(totals.totalSavings)} />
        <KpiBlock label="Discount" value={formatPercent(totals.blendedDiscount)} />
        
        {isInternal && (
          <>
            <KpiBlock label="Comm. ACV" value={formatCurrency(totals.totalCommissionableACV)} />
            <KpiBlock label="Total ACV" value={formatCurrency(totals.totalACV)} />
          </>
        )}
      </div>
    </div>
  );
}

function KpiBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center min-w-0 overflow-hidden">
      <span className="text-[10px] sm:text-xs font-semibold text-white/75 uppercase tracking-wide truncate w-full">{label}</span>
      <span className="text-base sm:text-lg md:text-xl font-extrabold text-white tabular-nums truncate w-full">
        {value}
      </span>
    </div>
  );
}
