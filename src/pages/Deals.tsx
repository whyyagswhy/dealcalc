import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDeals } from '@/hooks/useDeals';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LogOut, Plus, Loader2, Search, X, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { DealsList } from '@/components/deals/DealsList';
import { SearchInput } from '@/components/deals/SearchInput';

export default function Deals() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dealName, setDealName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useDeals({ searchQuery: debouncedSearch });

  const deals = useMemo(() => {
    return data?.pages.flatMap((page) => page.deals) || [];
  }, [data]);

  const handleCreateDeal = async () => {
    if (!dealName.trim() || !user) return;
    
    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('deals')
        .insert({
          user_id: user.id,
          name: dealName.trim(),
        });

      if (error) throw error;

      toast({
        title: 'Deal Created',
        description: `"${dealName}" has been created successfully.`,
      });
      
      setDealName('');
      setIsCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    } catch (error) {
      console.error('Error creating deal:', error);
      toast({
        title: 'Error',
        description: 'Failed to create deal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const isEmpty = !isLoading && deals.length === 0 && !searchQuery;
  const noResults = !isLoading && deals.length === 0 && searchQuery;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-card">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-foreground">Deal Scenario Calculator</h1>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="min-h-[44px]">
              <LogOut className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Empty State */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 rounded-full bg-muted p-6">
              <Plus className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-2xl font-semibold text-foreground">No deals yet</h2>
            <p className="mb-8 max-w-md text-muted-foreground">
              Create your first deal to start modeling and comparing pricing scenarios for your customers.
            </p>
            <Button size="lg" onClick={handleOpenCreateDialog} className="min-h-[44px] min-w-[200px]">
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Deal
            </Button>
          </div>
        )}

        {/* Deals List */}
        {!isEmpty && (
          <div className="space-y-4">
            {/* Search and Create */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full sm:max-w-xs">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search deals..."
                />
              </div>
              <Button onClick={handleOpenCreateDialog} className="min-h-[44px]">
                <Plus className="mr-2 h-4 w-4" />
                New Deal
              </Button>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="mb-4 text-destructive">Failed to load deals</p>
                <Button variant="outline" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            )}

            {/* No Search Results */}
            {noResults && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="mb-2 text-lg font-medium text-foreground">No deals found</p>
                <p className="text-muted-foreground">
                  No deals match "{searchQuery}". Try a different search.
                </p>
              </div>
            )}

            {/* Deals List */}
            {!isLoading && !isError && deals.length > 0 && (
              <DealsList
                deals={deals}
                hasNextPage={hasNextPage || false}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
              />
            )}
          </div>
        )}
      </main>

      {/* Create Deal Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Deal</DialogTitle>
            <DialogDescription>
              Enter a name for your new deal. You can add scenarios and line items after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deal-name">Deal Name</Label>
              <Input
                id="deal-name"
                placeholder="e.g., Acme Corp - Enterprise License"
                value={dealName}
                onChange={(e) => setDealName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && dealName.trim()) {
                    handleCreateDeal();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateDeal} 
              disabled={!dealName.trim() || isCreating}
              className="min-h-[44px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Deal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
