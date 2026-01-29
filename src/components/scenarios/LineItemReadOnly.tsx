import { cn } from '@/lib/utils';
import { useLineItemCalculations } from '@/hooks/useLineItemCalculations';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import type { LineItem, DisplayMode } from '@/lib/types';

interface LineItemReadOnlyProps {
  lineItem: LineItem;
  displayMode: DisplayMode;
}

export function LineItemReadOnly({ lineItem, displayMode }: LineItemReadOnlyProps) {
  const calculations = useLineItemCalculations(lineItem);
  
  const isMonthly = displayMode === 'monthly';
  const displayList = isMonthly ? calculations.listMonthly : calculations.listAnnual;
  const displayNet = isMonthly ? calculations.netMonthly : calculations.netAnnual;
  const periodLabel = isMonthly ? '/mo' : '/yr';
  
  const effectiveDiscount = lineItem.discount_percent ?? 
    (lineItem.list_unit_price > 0 && lineItem.net_unit_price !== null
      ? (lineItem.list_unit_price - lineItem.net_unit_price) / lineItem.list_unit_price
      : 0);

  return (
    <div className={cn(
      "rounded-lg border bg-card p-4 sm:p-5 space-y-3",
      "border-l-4 border-l-primary border-border"
    )}>
      {/* Product Name */}
      <div className="font-semibold text-foreground text-base">
        {lineItem.product_name || 'Unnamed Product'}
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground text-xs">Qty</span>
          <p className="font-medium tabular-nums">{lineItem.quantity}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Term</span>
          <p className="font-medium tabular-nums">{lineItem.term_months}mo</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">List{periodLabel}</span>
          <p className="font-medium tabular-nums">{formatCurrency(displayList)}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Net{periodLabel}</span>
          <p className="font-semibold text-primary tabular-nums">{formatCurrency(displayNet)}</p>
        </div>
      </div>

      {/* Discount & Term Totals */}
      <div className="grid grid-cols-3 gap-3 text-sm border-t border-divider pt-3">
        <div>
          <span className="text-muted-foreground text-xs">Discount</span>
          <p className="font-medium tabular-nums">{formatPercent(effectiveDiscount)}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Term List</span>
          <p className="font-medium tabular-nums">{formatCurrency(calculations.listTerm)}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Term Net</span>
          <p className="font-semibold text-primary tabular-nums">{formatCurrency(calculations.netTerm)}</p>
        </div>
      </div>
    </div>
  );
}
