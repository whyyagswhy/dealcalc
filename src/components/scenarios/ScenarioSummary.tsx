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

  // Calculate annual savings (list - net annual)
  const annualSavings = totals.listAnnual - totals.netAnnual;

  // Only show Incremental ACV if there's actual existing volume data
  const hasExistingVolumeData = totals.totalExistingAnnual > 0;

  if (lineItems.length === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        "sticky top-0 z-10 rounded-lg px-5 py-4 sm:px-6 sm:py-5",
        "bg-gradient-to-r from-[hsl(var(--grad-start))] to-[hsl(var(--grad-end))]",
        className
      )}
    >
      {isInternal ? (
        <div className="space-y-4">
          {/* Internal View: Row 1 - List, Net, Discount */}
          <div className="grid grid-cols-3 gap-6">
            <KpiBlock label={`List${periodLabel}`} value={formatCurrency(displayList)} />
            <KpiBlock label={`Net${periodLabel}`} value={formatCurrency(displayNet)} />
            <KpiBlock label="Discount" value={formatPercent(totals.blendedDiscount)} />
          </div>
          
          {/* Internal View: Row 2 - Term Total + ACV metrics */}
          <div className="pt-3 border-t border-white/20">
            {hasExistingVolumeData ? (
              <div className="grid grid-cols-3 gap-6">
                <KpiBlock label="Term Total" value={formatCurrency(totals.netTerm)} />
                <KpiBlock label="Incr. ACV" value={formatCurrency(totals.totalCommissionableACV)} />
                <KpiBlock label="Total ACV" value={formatCurrency(totals.totalACV)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <KpiBlock label="Term Total" value={formatCurrency(totals.netTerm)} />
                <KpiBlock label="Total ACV" value={formatCurrency(totals.totalACV)} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Customer View: Row 1 - Annual, Term Cost, Discount */}
          <div className="grid grid-cols-3 gap-6">
            <KpiBlock label="Annual" value={formatCurrency(totals.netAnnual)} />
            <KpiBlock label="Term Cost" value={formatCurrency(totals.netTerm)} />
            <KpiBlock label="Discount" value={formatPercent(totals.blendedDiscount)} />
          </div>
          
          {/* Customer View: Row 2 - Savings */}
          <div className="grid grid-cols-2 gap-6 pt-3 border-t border-white/20">
            <KpiBlock label="Annual Savings" value={formatCurrency(annualSavings)} />
            <KpiBlock label="Term Savings" value={formatCurrency(totals.totalSavings)} />
          </div>
        </div>
      )}
    </div>
  );
}

function KpiBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1">
      <span className="text-[10px] sm:text-xs font-semibold text-white/80 uppercase tracking-wider">
        {label}
      </span>
      <span className="text-lg sm:text-xl font-bold text-white tabular-nums">
        {value}
      </span>
    </div>
  );
}
