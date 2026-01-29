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

  return (
    <div 
      className={cn(
        "sticky top-0 z-10 rounded-lg p-4 sm:p-5 lg:p-6",
        "bg-gradient-to-r from-[hsl(var(--grad-start))] to-[hsl(var(--grad-end))]",
        className
      )}
    >
      {/* Responsive grid that adapts to container width */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-3">
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
    <div className="flex flex-col items-center text-center min-w-0">
      <span className="text-xs font-semibold text-white/75 uppercase tracking-wide">{label}</span>
      <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-white tabular-nums truncate">
        {value}
      </span>
    </div>
  );
}
