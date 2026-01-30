import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseDealSummaryOptions {
  dealId: string;
  onSuccess?: (summary: string) => void;
  onError?: (error: string) => void;
}

interface UseDealSummaryReturn {
  generate: (prompt?: string) => Promise<void>;
  summary: string | null;
  isGenerating: boolean;
  error: string | null;
  reset: () => void;
}

export function useDealSummary({ dealId, onSuccess, onError }: UseDealSummaryOptions): UseDealSummaryReturn {
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt?: string) => {
    if (!dealId) {
      setError('Deal ID is required');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-deal-summary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            deal_id: dealId,
            prompt: prompt || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || 'Failed to generate summary';
        
        if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (response.status === 402) {
          errorMessage = 'AI credits exhausted. Please add credits to your workspace.';
        } else if (response.status === 401) {
          errorMessage = 'Please sign in to generate summaries.';
        }
        
        setError(errorMessage);
        onError?.(errorMessage);
        toast({
          title: 'Generation failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      if (!data.success || !data.summary) {
        const errorMessage = data.error || 'No summary was generated';
        setError(errorMessage);
        onError?.(errorMessage);
        return;
      }

      setSummary(data.summary);
      onSuccess?.(data.summary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: 'Generation failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [dealId, onSuccess, onError]);

  const reset = useCallback(() => {
    setSummary(null);
    setError(null);
    setIsGenerating(false);
  }, []);

  return {
    generate,
    summary,
    isGenerating,
    error,
    reset,
  };
}
