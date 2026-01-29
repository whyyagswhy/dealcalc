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
      "rounded-lg border bg-card p-3 space-y-2",
      "border-l-4 border-l-primary border-border"
    )}>
      {/* Product Name */}
      <div className="font-medium text-foreground">
        {lineItem.product_name || 'Unnamed Product'}
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-4 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Qty</span>
          <p className="font-medium">{lineItem.quantity}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Term</span>
          <p className="font-medium">{lineItem.term_months}mo</p>
        </div>
        <div>
          <span className="text-muted-foreground">List{periodLabel}</span>
          <p className="font-medium">{formatCurrency(displayList)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Net{periodLabel}</span>
          <p className="font-medium text-primary">{formatCurrency(displayNet)}</p>
        </div>
      </div>

      {/* Discount & Term Totals */}
      <div className="grid grid-cols-3 gap-2 text-sm border-t border-border pt-2">
        <div>
          <span className="text-muted-foreground">Discount</span>
          <p className="font-medium">{formatPercent(effectiveDiscount)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Term List</span>
          <p className="font-medium">{formatCurrency(calculations.listTerm)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Term Net</span>
          <p className="font-medium text-primary">{formatCurrency(calculations.netTerm)}</p>
        </div>
      </div>
    </div>
  );
}
