import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDeal, useUpdateDeal } from '@/hooks/useDeal';
import { useScenarios, useCreateScenario, useUpdateScenario, useDeleteScenario, useCloneScenario } from '@/hooks/useScenarios';
import { useCreateLineItem } from '@/hooks/useLineItems';
import { useAutosave } from '@/hooks/useAutosave';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SaveStatusIndicator } from '@/components/deals/SaveStatusIndicator';
import { DealSettings } from '@/components/deals/DealSettings';
import { ImportContractDialog } from '@/components/deals/ImportContractDialog';
import { ScenarioCard } from '@/components/scenarios/ScenarioCard';
import { ScenarioComparison } from '@/components/scenarios/ScenarioComparison';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';
import type { Deal } from '@/lib/types';
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

export default function DealDetail() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading, isError } = useDeal(dealId);
  const { data: scenarios = [], isLoading: scenariosLoading } = useScenarios(dealId);
  const updateDeal = useUpdateDeal();
  const createScenario = useCreateScenario();
  const updateScenario = useUpdateScenario();
  const deleteScenario = useDeleteScenario();
  const cloneScenario = useCloneScenario();
  const createLineItem = useCreateLineItem();
  
  const [dealName, setDealName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [deleteScenarioId, setDeleteScenarioId] = useState<string | null>(null);

  // Initialize local state when deal loads
  useEffect(() => {
    if (deal && !isInitialized) {
      setDealName(deal.name);
      setIsInitialized(true);
    }
  }, [deal, isInitialized]);

  const handleSave = useCallback(async (name: string) => {
    if (!dealId || !name.trim()) return;
    await updateDeal.mutateAsync({ id: dealId, updates: { name: name.trim() } });
  }, [dealId, updateDeal]);

  const { status, retry } = useAutosave({
    data: dealName,
    onSave: handleSave,
    delay: 400,
    enabled: isInitialized && dealName !== deal?.name,
  });

  // Scenarios selected for comparison (in customer view) - must be before early returns
  const comparisonScenarios = useMemo(() => {
    return scenarios.filter(s => s.compare_enabled);
  }, [scenarios]);

  const handleAddScenario = async () => {
    if (!dealId) return;
    
    const scenarioNumber = scenarios.length + 1;
    const maxPosition = scenarios.length > 0 
      ? Math.max(...scenarios.map(s => s.position)) + 1 
      : 0;
    
    await createScenario.mutateAsync({
      deal_id: dealId,
      name: `Scenario ${scenarioNumber}`,
      position: maxPosition,
    });
  };

  const handleUpdateScenarioName = async (scenarioId: string, name: string) => {
    await updateScenario.mutateAsync({ id: scenarioId, updates: { name } });
  };

  const handleUpdateScenario = async (scenarioId: string, updates: Partial<typeof scenarios[0]>) => {
    await updateScenario.mutateAsync({ id: scenarioId, updates });
  };

  const handleDeleteScenario = async () => {
    if (deleteScenarioId && dealId) {
      await deleteScenario.mutateAsync({ id: deleteScenarioId, dealId });
      setDeleteScenarioId(null);
    }
  };

  const handleCloneScenario = async (scenario: typeof scenarios[0]) => {
    if (!dealId) return;
    await cloneScenario.mutateAsync({ scenario, dealId });
  };

  const handleImportContract = async (lineItems: Array<{
    product_name: string;
    list_unit_price: number;
    quantity: number;
    term_months: number;
    discount_percent: number | null;
    net_unit_price: number | null;
  }>) => {
    if (!dealId) return;
    
    // Create "Current Contract" scenario
    const maxPosition = scenarios.length > 0 
      ? Math.max(...scenarios.map(s => s.position)) + 1 
      : 0;
    
    const newScenario = await createScenario.mutateAsync({
      deal_id: dealId,
      name: 'Current Contract',
      position: maxPosition,
    });

    // Create line items for this scenario
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      await createLineItem.mutateAsync({
        scenario_id: newScenario.id,
        product_name: item.product_name,
        list_unit_price: item.list_unit_price,
        quantity: item.quantity,
        term_months: item.term_months,
        discount_percent: item.discount_percent,
        net_unit_price: item.net_unit_price,
        revenue_type: 'net_new',
        position: i,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !deal) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-destructive">Failed to load deal</p>
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Deals
        </Button>
      </div>
    );
  }

  const hasScenarios = scenarios.length > 0;
  const showComparison = deal.view_mode === 'customer' && comparisonScenarios.length >= 2;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Back</span>
          </Button>
          
          <div className="flex flex-1 items-center gap-4 min-w-0">
            <Input
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              className="max-w-md border-transparent bg-transparent text-lg font-semibold hover:border-input focus:border-input"
              placeholder="Deal name"
            />
            <SaveStatusIndicator status={status} onRetry={retry} />
          </div>
          
          <div className="flex items-center gap-2">
            <ImportContractDialog 
              dealId={dealId!} 
              onImportComplete={handleImportContract} 
            />
            <DealSettings 
              deal={deal} 
              onUpdate={(updates: Partial<Deal>) => updateDeal.mutate({ id: dealId!, updates })} 
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {scenariosLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasScenarios ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">No scenarios yet</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Add your first scenario to start building pricing options for this deal.
            </p>
            <Button 
              onClick={handleAddScenario} 
              disabled={createScenario.isPending}
              className="min-h-[44px]"
            >
              {createScenario.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Scenario
            </Button>
          </div>
        ) : (
          /* Scenarios List */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Scenarios</h2>
              <Button 
                onClick={handleAddScenario} 
                disabled={createScenario.isPending}
                size="sm"
                className="min-h-[44px]"
              >
                {createScenario.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add Scenario
              </Button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4">
              {scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onUpdateName={(name) => handleUpdateScenarioName(scenario.id, name)}
                  onUpdateScenario={(updates) => handleUpdateScenario(scenario.id, updates)}
                  onDelete={() => setDeleteScenarioId(scenario.id)}
                  onClone={() => handleCloneScenario(scenario)}
                  allScenarios={scenarios}
                  displayMode={deal.display_mode}
                  viewMode={deal.view_mode}
                  enableExistingVolume={deal.enable_existing_volume}
                />
              ))}
            </div>
            
            {/* Comparison Section */}
            {showComparison && (
              <ScenarioComparison 
                scenarios={comparisonScenarios} 
                dealDisplayMode={deal.display_mode}
              />
            )}
          </div>
        )}
      </main>

      {/* Delete Scenario Confirmation */}
      <AlertDialog open={!!deleteScenarioId} onOpenChange={() => setDeleteScenarioId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scenario</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scenario? All line items will be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteScenario}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
