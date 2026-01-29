import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDeal, useUpdateDeal } from '@/hooks/useDeal';
import { useAutosave } from '@/hooks/useAutosave';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SaveStatusIndicator } from '@/components/deals/SaveStatusIndicator';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';

export default function DealDetail() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading, isError } = useDeal(dealId);
  const updateDeal = useUpdateDeal();
  
  const [dealName, setDealName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

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
        </div>
      </header>

      {/* Main Content - Empty Scenario Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground">No scenarios yet</h2>
          <p className="mb-6 max-w-md text-muted-foreground">
            Add your first scenario to start building pricing options for this deal.
          </p>
          <Button className="min-h-[44px]">
            <Plus className="mr-2 h-4 w-4" />
            Add Scenario
          </Button>
        </div>
      </main>
    </div>
  );
}
