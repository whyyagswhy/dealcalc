import { useState, useEffect, useCallback } from 'react';
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
import { cn } from '@/lib/utils';
import type { LineItem, Scenario, RevenueType } from '@/lib/types';

interface LineItemRowProps {
  lineItem: LineItem;
  onUpdate: (updates: Partial<LineItem>) => void;
  onDelete: () => void;
  allScenarios: Scenario[];
  currentScenarioId: string;
}

type InputMode = 'discount' | 'net';

export function LineItemRow({ 
  lineItem, 
  onUpdate, 
  onDelete, 
  allScenarios,
  currentScenarioId,
}: LineItemRowProps) {
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
  const [inputMode, setInputMode] = useState<InputMode>(
    lineItem.discount_percent !== null ? 'discount' : 'net'
  );

  const cloneLineItem = useCloneLineItem();
  const otherScenarios = allScenarios.filter(s => s.id !== currentScenarioId);

  // Sync state when lineItem changes
  useEffect(() => {
    setProductName(lineItem.product_name);
    setListUnitPrice(lineItem.list_unit_price.toString());
    setQuantity(lineItem.quantity.toString());
    setTermMonths(lineItem.term_months.toString());
    setDiscountPercent(lineItem.discount_percent !== null ? (lineItem.discount_percent * 100).toString() : '');
    setNetUnitPrice(lineItem.net_unit_price !== null ? lineItem.net_unit_price.toString() : '');
    setRevenueType(lineItem.revenue_type);
  }, [lineItem]);

  // Auto-compute: discount → net
  const handleDiscountChange = (value: string) => {
    setDiscountPercent(value);
    setInputMode('discount');
    
    const discount = parseFloat(value) / 100;
    const list = parseFloat(listUnitPrice);
    
    if (!isNaN(discount) && !isNaN(list) && discount >= 0 && discount <= 100) {
      const net = list * (1 - discount);
      setNetUnitPrice(net.toFixed(2));
    }
  };

  // Auto-compute: net → discount
  const handleNetChange = (value: string) => {
    setNetUnitPrice(value);
    setInputMode('net');
    
    const net = parseFloat(value);
    const list = parseFloat(listUnitPrice);
    
    if (!isNaN(net) && !isNaN(list) && list > 0) {
      const discount = ((list - net) / list) * 100;
      setDiscountPercent(discount.toFixed(1));
    }
  };

  // Recalculate when list price changes
  useEffect(() => {
    const list = parseFloat(listUnitPrice);
    if (isNaN(list) || list <= 0) return;

    if (inputMode === 'discount') {
      const discount = parseFloat(discountPercent) / 100;
      if (!isNaN(discount)) {
        const net = list * (1 - discount);
        setNetUnitPrice(net.toFixed(2));
      }
    } else {
      const net = parseFloat(netUnitPrice);
      if (!isNaN(net)) {
        const discount = ((list - net) / list) * 100;
        setDiscountPercent(discount.toFixed(1));
      }
    }
  }, [listUnitPrice]);

  const getCurrentUpdates = useCallback((): Partial<LineItem> => {
    return {
      product_name: productName,
      list_unit_price: parseFloat(listUnitPrice) || 0,
      quantity: parseInt(quantity) || 0,
      term_months: parseInt(termMonths) || 12,
      discount_percent: discountPercent ? parseFloat(discountPercent) / 100 : null,
      net_unit_price: netUnitPrice ? parseFloat(netUnitPrice) : null,
      revenue_type: revenueType,
    };
  }, [productName, listUnitPrice, quantity, termMonths, discountPercent, netUnitPrice, revenueType]);

  const handleSave = useCallback(async () => {
    onUpdate(getCurrentUpdates());
  }, [onUpdate, getCurrentUpdates]);

  const { status } = useAutosave({
    data: getCurrentUpdates(),
    onSave: handleSave,
    delay: 400,
    enabled: true,
  });

  const handleCopyToScenario = async (targetScenarioId: string) => {
    await cloneLineItem.mutateAsync({ lineItem, targetScenarioId });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3">
      {/* Row 1: Product Name */}
      <div>
        <Label className="text-xs text-muted-foreground">Product</Label>
        <Input
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="e.g., Sales Cloud"
          className="h-9"
        />
      </div>

      {/* Row 2: Price, Qty, Term */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">List Price/mo</Label>
          <Input
            type="number"
            value={listUnitPrice}
            onChange={(e) => setListUnitPrice(e.target.value)}
            placeholder="e.g., 150"
            className="h-9"
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
            className="h-9"
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
            className="h-9"
            min="1"
            step="1"
          />
        </div>
      </div>

      {/* Row 3: Discount / Net Price */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">Discount %</Label>
          <Input
            type="number"
            value={discountPercent}
            onChange={(e) => handleDiscountChange(e.target.value)}
            placeholder="e.g., 20"
            className={cn("h-9", inputMode === 'net' && "bg-muted text-muted-foreground")}
            min="0"
            max="100"
            step="0.1"
            readOnly={inputMode === 'net'}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Net Price/mo</Label>
          <Input
            type="number"
            value={netUnitPrice}
            onChange={(e) => handleNetChange(e.target.value)}
            placeholder="e.g., 120"
            className={cn("h-9", inputMode === 'discount' && "bg-muted text-muted-foreground")}
            min="0"
            step="0.01"
            readOnly={inputMode === 'discount'}
          />
        </div>
      </div>

      {/* Row 4: Revenue Type and Actions */}
      <div className="flex items-center justify-between gap-2">
        <Select value={revenueType} onValueChange={(v) => setRevenueType(v as RevenueType)}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="net_new">Net New</SelectItem>
            <SelectItem value="add_on">Add-on</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
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
