import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, Copy, MoreVertical, Loader2 } from 'lucide-react';
import { useAutosave } from '@/hooks/useAutosave';
import { useCloneLineItem } from '@/hooks/useLineItems';
import { ExistingVolumeFields } from './ExistingVolumeFields';
import { DisplayModeToggle } from './DisplayModeToggle';
import { ProductCombobox } from './ProductCombobox';
import { cn } from '@/lib/utils';
import type { LineItem, Scenario, RevenueType, DisplayMode } from '@/lib/types';

interface LineItemRowProps {
  lineItem: LineItem;
  onUpdate: (updates: Partial<LineItem>) => void;
  onDelete: () => void;
  allScenarios: Scenario[];
  currentScenarioId: string;
  showExistingVolume: boolean;
  viewMode: 'internal' | 'customer';
  effectiveDisplayMode: DisplayMode;
}

// Parse helpers
const parseFloatSafe = (value: string): number | null => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

const parseIntSafe = (value: string): number | null => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
};

export function LineItemRow({ 
  lineItem, 
  onUpdate, 
  onDelete, 
  allScenarios,
  currentScenarioId,
  showExistingVolume,
  viewMode,
  effectiveDisplayMode,
}: LineItemRowProps) {
  // Track if this is the initial mount for this specific line item
  const lineItemIdRef = useRef(lineItem.id);
  const isInitializedRef = useRef(false);
  
  // Local state for form fields
  const [productName, setProductName] = useState(lineItem.product_name);
  const [listUnitPrice, setListUnitPrice] = useState(lineItem.list_unit_price.toString());
  const [quantity, setQuantity] = useState(lineItem.quantity.toString());
  const [termMonths, setTermMonths] = useState(lineItem.term_months.toString());
  const [discountPercent, setDiscountPercent] = useState(
    lineItem.discount_percent !== null ? (lineItem.discount_percent * 100).toString() : ''
  );
  const [netUnitPrice, setNetUnitPrice] = useState(
    lineItem.net_unit_price !== null ? lineItem.net_unit_price.toString() : ''
  );
  const [revenueType, setRevenueType] = useState<RevenueType>(lineItem.revenue_type);
  const [displayOverride, setDisplayOverride] = useState<DisplayMode | null>(lineItem.display_override);
  
  // Existing volume fields (for add-ons)
  const [existingVolume, setExistingVolume] = useState(
    lineItem.existing_volume !== null ? lineItem.existing_volume.toString() : ''
  );
  const [existingNetPrice, setExistingNetPrice] = useState(
    lineItem.existing_net_price !== null ? lineItem.existing_net_price.toString() : ''
  );
  const [existingTermMonths, setExistingTermMonths] = useState(
    lineItem.existing_term_months !== null ? lineItem.existing_term_months.toString() : ''
  );

  const cloneLineItem = useCloneLineItem();
  const otherScenarios = allScenarios.filter(s => s.id !== currentScenarioId);
  
  // Show baseline fields only for add-on lines in internal view with toggle enabled
  const shouldShowBaseline = showExistingVolume && viewMode === 'internal' && revenueType === 'add_on';

  // Only sync from props when the line item ID changes (new item loaded)
  useEffect(() => {
    if (lineItemIdRef.current !== lineItem.id) {
      lineItemIdRef.current = lineItem.id;
      isInitializedRef.current = false;
    }
    
    if (!isInitializedRef.current) {
      setProductName(lineItem.product_name);
      setListUnitPrice(lineItem.list_unit_price.toString());
      setQuantity(lineItem.quantity.toString());
      setTermMonths(lineItem.term_months.toString());
      setDiscountPercent(lineItem.discount_percent !== null ? (lineItem.discount_percent * 100).toString() : '');
      setNetUnitPrice(lineItem.net_unit_price !== null ? lineItem.net_unit_price.toString() : '');
      setRevenueType(lineItem.revenue_type);
      setDisplayOverride(lineItem.display_override);
      setExistingVolume(lineItem.existing_volume !== null ? lineItem.existing_volume.toString() : '');
      setExistingNetPrice(lineItem.existing_net_price !== null ? lineItem.existing_net_price.toString() : '');
      setExistingTermMonths(lineItem.existing_term_months !== null ? lineItem.existing_term_months.toString() : '');
      isInitializedRef.current = true;
    }
  }, [lineItem.id, lineItem.product_name, lineItem.list_unit_price, lineItem.quantity, lineItem.term_months, lineItem.discount_percent, lineItem.net_unit_price, lineItem.revenue_type, lineItem.display_override, lineItem.existing_volume, lineItem.existing_net_price, lineItem.existing_term_months]);

  // Auto-compute: discount → net (last edited wins)
  const handleDiscountChange = useCallback((value: string) => {
    setDiscountPercent(value);
    
    const discount = parseFloatSafe(value);
    const list = parseFloatSafe(listUnitPrice);
    
    if (discount !== null && list !== null && discount >= 0 && discount <= 100) {
      const net = list * (1 - discount / 100);
      setNetUnitPrice(net.toFixed(2));
    }
  }, [listUnitPrice]);

  // Auto-compute: net → discount (last edited wins)
  const handleNetChange = useCallback((value: string) => {
    setNetUnitPrice(value);
    
    const net = parseFloatSafe(value);
    const list = parseFloatSafe(listUnitPrice);
    
    if (net !== null && list !== null && list > 0) {
      const discount = ((list - net) / list) * 100;
      setDiscountPercent(discount.toFixed(1));
    }
  }, [listUnitPrice]);

  // Recalculate when list price changes - use discount as driver
  const handleListPriceChange = useCallback((value: string) => {
    setListUnitPrice(value);
    
    const list = parseFloatSafe(value);
    if (list === null || list <= 0) return;

    const discount = parseFloatSafe(discountPercent);
    if (discount !== null) {
      const net = list * (1 - discount / 100);
      setNetUnitPrice(net.toFixed(2));
    }
  }, [discountPercent]);

  // Build the update object - memoized to prevent unnecessary re-renders
  const currentUpdates = useMemo((): Partial<LineItem> => {
    return {
      product_name: productName,
      list_unit_price: parseFloatSafe(listUnitPrice) ?? 0,
      quantity: parseIntSafe(quantity) ?? 0,
      term_months: parseIntSafe(termMonths) ?? 12,
      discount_percent: discountPercent ? (parseFloatSafe(discountPercent) ?? 0) / 100 : null,
      net_unit_price: netUnitPrice ? parseFloatSafe(netUnitPrice) : null,
      revenue_type: revenueType,
      display_override: displayOverride,
      existing_volume: existingVolume ? parseIntSafe(existingVolume) : null,
      existing_net_price: existingNetPrice ? parseFloatSafe(existingNetPrice) : null,
      existing_term_months: existingTermMonths ? parseIntSafe(existingTermMonths) : null,
    };
  }, [productName, listUnitPrice, quantity, termMonths, discountPercent, netUnitPrice, revenueType, displayOverride, existingVolume, existingNetPrice, existingTermMonths]);

  // Check if local state differs from the original line item
  const hasChanges = useMemo(() => {
    const orig = {
      product_name: lineItem.product_name,
      list_unit_price: lineItem.list_unit_price,
      quantity: lineItem.quantity,
      term_months: lineItem.term_months,
      discount_percent: lineItem.discount_percent,
      net_unit_price: lineItem.net_unit_price,
      revenue_type: lineItem.revenue_type,
      display_override: lineItem.display_override,
      existing_volume: lineItem.existing_volume,
      existing_net_price: lineItem.existing_net_price,
      existing_term_months: lineItem.existing_term_months,
    };
    
    const current = {
      product_name: productName,
      list_unit_price: parseFloatSafe(listUnitPrice) ?? 0,
      quantity: parseIntSafe(quantity) ?? 0,
      term_months: parseIntSafe(termMonths) ?? 12,
      discount_percent: discountPercent ? (parseFloatSafe(discountPercent) ?? 0) / 100 : null,
      net_unit_price: netUnitPrice ? parseFloatSafe(netUnitPrice) : null,
      revenue_type: revenueType,
      display_override: displayOverride,
      existing_volume: existingVolume ? parseIntSafe(existingVolume) : null,
      existing_net_price: existingNetPrice ? parseFloatSafe(existingNetPrice) : null,
      existing_term_months: existingTermMonths ? parseIntSafe(existingTermMonths) : null,
    };
    
    return JSON.stringify(orig) !== JSON.stringify(current);
  }, [lineItem, productName, listUnitPrice, quantity, termMonths, discountPercent, netUnitPrice, revenueType, displayOverride, existingVolume, existingNetPrice, existingTermMonths]);

  const handleSave = useCallback(async () => {
    onUpdate(currentUpdates);
  }, [onUpdate, currentUpdates]);

  const { status } = useAutosave({
    data: currentUpdates,
    onSave: handleSave,
    delay: 500,
    enabled: hasChanges && isInitializedRef.current,
  });

  const handleCopyToScenario = async (targetScenarioId: string) => {
    await cloneLineItem.mutateAsync({ lineItem, targetScenarioId });
  };

  return (
    <div className={cn(
      "rounded-lg border bg-card p-4 sm:p-5 space-y-4 shadow-card",
      revenueType === 'net_new' 
        ? "border-l-4 border-l-primary border-border" 
        : "border-l-4 border-l-secondary border-border"
    )}>
      {/* Row 1: Product Name + Display Toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground">Product</Label>
          <ProductCombobox
            value={productName}
            onChange={setProductName}
            onPriceSelect={(monthlyPrice) => {
              // Auto-fill list price when a price book product is selected
              setListUnitPrice(monthlyPrice.toFixed(2));
              // Recalculate net price if there's a discount
              const discount = parseFloatSafe(discountPercent);
              if (discount !== null && discount >= 0 && discount <= 100) {
                const net = monthlyPrice * (1 - discount / 100);
                setNetUnitPrice(net.toFixed(2));
              }
            }}
            placeholder="Search or select product..."
          />
        </div>
        {viewMode === 'internal' && (
          <div className="pt-6">
            <DisplayModeToggle
              value={displayOverride}
              onChange={setDisplayOverride}
              inheritedValue={effectiveDisplayMode}
              size="xs"
            />
          </div>
        )}
      </div>

      {/* Row 2: Price, Qty, Term */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">List Price/mo</Label>
          <Input
            type="number"
            value={listUnitPrice}
            onChange={(e) => handleListPriceChange(e.target.value)}
            placeholder="e.g., 150"
            className="h-10"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Qty</Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g., 25"
            className="h-10"
            min="0"
            step="1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Term (mo)</Label>
          <Input
            type="number"
            value={termMonths}
            onChange={(e) => setTermMonths(e.target.value)}
            placeholder="e.g., 12"
            className="h-10"
            min="1"
            step="1"
          />
        </div>
      </div>

      {/* Row 3: Discount / Net Price - both fully editable */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Discount %</Label>
          <Input
            type="number"
            value={discountPercent}
            onChange={(e) => handleDiscountChange(e.target.value)}
            placeholder="e.g., 20"
            className="h-10"
            min="0"
            max="100"
            step="0.1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Net Price/mo</Label>
          <Input
            type="number"
            value={netUnitPrice}
            onChange={(e) => handleNetChange(e.target.value)}
            placeholder="e.g., 120"
            className="h-10"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Row 4: Existing Volume (for add-ons in internal view) */}
      {shouldShowBaseline && (
        <ExistingVolumeFields
          existingVolume={existingVolume}
          existingNetPrice={existingNetPrice}
          existingTermMonths={existingTermMonths}
          onExistingVolumeChange={setExistingVolume}
          onExistingNetPriceChange={setExistingNetPrice}
          onExistingTermMonthsChange={setExistingTermMonths}
        />
      )}

      {/* Row 5: Revenue Type and Actions */}
      <div className="flex items-center justify-between gap-2">
        {viewMode === 'internal' && (
          <Select value={revenueType} onValueChange={(v) => setRevenueType(v as RevenueType)}>
            <SelectTrigger className="h-10 w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="net_new">Net New</SelectItem>
              <SelectItem value="add_on">Add-on</SelectItem>
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2">
          {status === 'saving' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCopyToScenario(currentScenarioId)}>
                <Copy className="mr-2 h-4 w-4" />
                Clone
              </DropdownMenuItem>
              {otherScenarios.length > 0 && otherScenarios.map(scenario => (
                <DropdownMenuItem 
                  key={scenario.id} 
                  onClick={() => handleCopyToScenario(scenario.id)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to {scenario.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
