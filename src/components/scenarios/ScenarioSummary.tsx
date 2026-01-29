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
    <div className={cn(
      "sticky top-0 z-10 rounded-lg border border-border bg-muted/50 p-3 backdrop-blur-sm",
      className
    )}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {/* List vs Net */}
        <div>
          <span className="text-muted-foreground">List{periodLabel}</span>
          <p className="font-medium text-foreground">{formatCurrency(displayList)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Net{periodLabel}</span>
          <p className="font-medium text-foreground">{formatCurrency(displayNet)}</p>
        </div>

        {/* Term Totals */}
        <div>
          <span className="text-muted-foreground">Term List</span>
          <p className="font-medium text-foreground">{formatCurrency(totals.listTerm)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Term Net</span>
          <p className="font-medium text-foreground">{formatCurrency(totals.netTerm)}</p>
        </div>

        {/* Savings & Discount */}
        <div>
          <span className="text-muted-foreground">Total Savings</span>
          <p className="font-medium text-primary">{formatCurrency(totals.totalSavings)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Blended Discount</span>
          <p className="font-medium text-foreground">{formatPercent(totals.blendedDiscount)}</p>
        </div>

        {/* Internal-only metrics */}
        {isInternal && (
          <>
            <div>
              <span className="text-muted-foreground">Commissionable ACV</span>
              <p className="font-semibold text-primary">{formatCurrency(totals.totalCommissionableACV)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total ACV</span>
              <p className="font-medium text-foreground">{formatCurrency(totals.totalACV)}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
