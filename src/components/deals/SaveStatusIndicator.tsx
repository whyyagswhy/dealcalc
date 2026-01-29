import { Check, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SaveStatus } from '@/hooks/useAutosave';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  onRetry?: () => void;
}

export function SaveStatusIndicator({ status, onRetry }: SaveStatusIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {status === 'saved' && (
        <>
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-muted-foreground">Saved</span>
        </>
      )}
      
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}
      
      {status === 'error' && (
        <>
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive">Save failed</span>
          {onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry} className="h-7 gap-1 px-2">
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          )}
        </>
      )}
    </div>
  );
}
