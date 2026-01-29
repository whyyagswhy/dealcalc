import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useLineItems, useCreateLineItem, useDeleteLineItem, useUpdateLineItem } from '@/hooks/useLineItems';
import { LineItemRow } from './LineItemRow';
import { ScenarioSummary } from './ScenarioSummary';
import { useAutosave } from '@/hooks/useAutosave';
import { SaveStatusIndicator } from '@/components/deals/SaveStatusIndicator';
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
  onDelete: () => void;
  allScenarios: Scenario[];
  displayMode: DisplayMode;
  viewMode: ViewMode;
}

export function ScenarioCard({ 
  scenario, 
  onUpdateName, 
  onDelete, 
  allScenarios,
  displayMode,
  viewMode,
}: ScenarioCardProps) {
  const [scenarioName, setScenarioName] = useState(scenario.name);
  const [deleteLineItemId, setDeleteLineItemId] = useState<string | null>(null);
  
  const { data: lineItems = [], isLoading } = useLineItems(scenario.id);
  const createLineItem = useCreateLineItem();
  const deleteLineItem = useDeleteLineItem();
  const updateLineItem = useUpdateLineItem();

  useEffect(() => {
    setScenarioName(scenario.name);
  }, [scenario.name]);

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

  return (
    <Card className="min-w-[350px] flex-shrink-0 sm:min-w-[400px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <Input
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            className="h-8 border-transparent bg-transparent text-lg font-semibold hover:border-input focus:border-input"
            placeholder="Scenario name"
          />
          <div className="flex items-center gap-2">
            <SaveStatusIndicator status={nameStatus} onRetry={retryName} />
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Scenario Summary - sticky header */}
        <ScenarioSummary
          lineItems={lineItems}
          displayMode={scenario.display_override ?? displayMode}
          viewMode={viewMode}
        />
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : lineItems.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No line items yet. Add your first product.
          </div>
        ) : (
          <div className="space-y-2">
            {lineItems.map((lineItem) => (
              <LineItemRow
                key={lineItem.id}
                lineItem={lineItem}
                onUpdate={(updates) => handleUpdateLineItem(lineItem.id, updates)}
                onDelete={() => setDeleteLineItemId(lineItem.id)}
                allScenarios={allScenarios}
                currentScenarioId={scenario.id}
              />
            ))}
          </div>
        )}
        
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
