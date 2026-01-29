import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Plus } from 'lucide-react';

export default function Deals() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-foreground">Deal Scenario Calculator</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 rounded-full bg-muted p-6">
            <Plus className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="mb-2 text-2xl font-semibold text-foreground">No deals yet</h2>
          <p className="mb-8 max-w-md text-muted-foreground">
            Create your first deal to start modeling and comparing pricing scenarios for your customers.
          </p>
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create Your First Deal
          </Button>
        </div>
      </main>
    </div>
  );
}
