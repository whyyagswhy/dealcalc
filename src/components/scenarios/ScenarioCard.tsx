import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Loader2, Copy, MoreVertical } from 'lucide-react';
import { useLineItems, useCreateLineItem, useDeleteLineItem, useUpdateLineItem } from '@/hooks/useLineItems';
import { LineItemRow } from './LineItemRow';
import { LineItemReadOnly } from './LineItemReadOnly';
import { ScenarioSummary } from './ScenarioSummary';
import { DisplayModeToggle } from './DisplayModeToggle';
import { useAutosave } from '@/hooks/useAutosave';
import { SaveStatusIndicator } from '@/components/deals/SaveStatusIndicator';
import { resolveDisplayMode } from '@/lib/types';
import type { Scenario, LineItem, DisplayMode, ViewMode } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ScenarioCardProps {
  scenario: Scenario;
  onUpdateName: (name: string) => void;
  onUpdateScenario: (updates: Partial<Scenario>) => void;
  onDelete: () => void;
  onClone: () => void;
  allScenarios: Scenario[];
  displayMode: DisplayMode;
  viewMode: ViewMode;
  enableExistingVolume: boolean;
}

export function ScenarioCard({ 
  scenario, 
  onUpdateName,
  onUpdateScenario,
  onDelete, 
  onClone,
  allScenarios,
  displayMode,
  viewMode,
  enableExistingVolume,
}: ScenarioCardProps) {
  const [scenarioName, setScenarioName] = useState(scenario.name);
  const [deleteLineItemId, setDeleteLineItemId] = useState<string | null>(null);
  const [localDisplayOverride, setLocalDisplayOverride] = useState<DisplayMode | null>(scenario.display_override);
  const [localCompareEnabled, setLocalCompareEnabled] = useState(scenario.compare_enabled);
  
  const { data: lineItems = [], isLoading } = useLineItems(scenario.id);
  const createLineItem = useCreateLineItem();
  const deleteLineItem = useDeleteLineItem();
  const updateLineItem = useUpdateLineItem();

  // Effective display mode for this scenario
  const effectiveDisplayMode = resolveDisplayMode(displayMode, scenario.display_override);

  useEffect(() => {
    setScenarioName(scenario.name);
    setLocalDisplayOverride(scenario.display_override);
    setLocalCompareEnabled(scenario.compare_enabled);
  }, [scenario.name, scenario.display_override, scenario.compare_enabled]);

  const handleSaveName = useCallback(async (name: string) => {
    if (name.trim() && name !== scenario.name) {
      onUpdateName(name.trim());
    }
  }, [scenario.name, onUpdateName]);

  const { status: nameStatus, retry: retryName } = useAutosave({
    data: scenarioName,
    onSave: handleSaveName,
    delay: 400,
    enabled: scenarioName !== scenario.name && scenarioName.trim().length > 0,
  });

  const handleDisplayOverrideChange = (value: DisplayMode | null) => {
    setLocalDisplayOverride(value);
    onUpdateScenario({ display_override: value });
  };

  const handleCompareEnabledChange = (checked: boolean) => {
    setLocalCompareEnabled(checked);
    onUpdateScenario({ compare_enabled: checked });
  };

  const handleAddLineItem = async () => {
    const maxPosition = lineItems.length > 0 
      ? Math.max(...lineItems.map(li => li.position)) + 1 
      : 0;
    
    await createLineItem.mutateAsync({
      scenario_id: scenario.id,
      product_name: '',
      list_unit_price: 0,
      quantity: 1,
      term_months: 12,
      revenue_type: 'net_new',
      position: maxPosition,
    });
  };

  const handleDeleteLineItem = async () => {
    if (deleteLineItemId) {
      await deleteLineItem.mutateAsync({ id: deleteLineItemId, scenarioId: scenario.id });
      setDeleteLineItemId(null);
    }
  };

  const handleUpdateLineItem = async (id: string, updates: Partial<LineItem>) => {
    await updateLineItem.mutateAsync({ id, updates });
  };

  const isInternal = viewMode === 'internal';
  const isCustomer = viewMode === 'customer';

  return (
    <Card className="min-w-[350px] flex-shrink-0 sm:min-w-[400px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          {isInternal ? (
            <Input
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="h-8 border-transparent bg-transparent text-lg font-semibold hover:border-input focus:border-input"
              placeholder="Scenario name"
            />
          ) : (
            <h3 className="text-lg font-semibold text-foreground">{scenarioName}</h3>
          )}
          <div className="flex items-center gap-1">
            {isInternal && (
              <>
                <DisplayModeToggle
                  value={localDisplayOverride}
                  onChange={handleDisplayOverrideChange}
                  inheritedValue={displayMode}
                  size="xs"
                />
                <SaveStatusIndicator status={nameStatus} onRetry={retryName} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onClone}>
                      <Copy className="mr-2 h-4 w-4" />
                      Clone Scenario
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {isCustomer && (
              <div className="flex items-center gap-2">
                <Label htmlFor={`compare-${scenario.id}`} className="text-xs text-muted-foreground">
                  Compare
                </Label>
                <Switch
                  id={`compare-${scenario.id}`}
                  checked={localCompareEnabled}
                  onCheckedChange={handleCompareEnabledChange}
                  className="scale-75"
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Scenario Summary - sticky header */}
        <ScenarioSummary
          lineItems={lineItems}
          displayMode={effectiveDisplayMode}
          viewMode={viewMode}
        />
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : lineItems.length === 0 && isInternal ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No line items yet. Add your first product.
          </div>
        ) : lineItems.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No products in this scenario.
          </div>
        ) : (
          <div className="space-y-2">
            {lineItems.map((lineItem) => {
              const lineEffectiveDisplay = resolveDisplayMode(displayMode, scenario.display_override, lineItem.display_override);
              return isInternal ? (
                <LineItemRow
                  key={lineItem.id}
                  lineItem={lineItem}
                  onUpdate={(updates) => handleUpdateLineItem(lineItem.id, updates)}
                  onDelete={() => setDeleteLineItemId(lineItem.id)}
                  allScenarios={allScenarios}
                  currentScenarioId={scenario.id}
                  showExistingVolume={enableExistingVolume}
                  viewMode={viewMode}
                  effectiveDisplayMode={effectiveDisplayMode}
                />
              ) : (
                <LineItemReadOnly
                  key={lineItem.id}
                  lineItem={lineItem}
                  displayMode={lineEffectiveDisplay}
                />
              );
            })}
          </div>
        )}
        
        {isInternal && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddLineItem}
            disabled={createLineItem.isPending}
            className="w-full min-h-[44px]"
          >
            {createLineItem.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Line Item
          </Button>
        )}
      </CardContent>

      <AlertDialog open={!!deleteLineItemId} onOpenChange={() => setDeleteLineItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Line Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this line item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLineItem}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
