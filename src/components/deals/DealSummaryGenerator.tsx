import { useState, useEffect } from 'react';
import { useDealSummary } from '@/hooks/useDealSummary';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Copy, RefreshCw, X, Loader2 } from 'lucide-react';

interface DealSummaryGeneratorProps {
  dealId: string;
  dealName: string;
  hasScenarios: boolean;
}

export function DealSummaryGenerator({ dealId, dealName, hasScenarios }: DealSummaryGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  
  const { generate, summary, isGenerating, error, reset } = useDealSummary({
    dealId,
    onSuccess: () => {
      toast({
        title: 'Summary generated',
        description: 'Your deal summary is ready to copy.',
      });
    },
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Don't reset immediately to allow for animation
      const timer = setTimeout(() => {
        reset();
        setCustomPrompt('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, reset]);

  const handleGenerate = () => {
    generate(customPrompt);
  };

  const handleCopy = async () => {
    if (!summary) return;
    
    try {
      await navigator.clipboard.writeText(summary);
      toast({
        title: 'Copied!',
        description: 'Summary copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard. Please select and copy manually.',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerate = () => {
    generate(customPrompt);
  };

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setIsOpen(true)}
        disabled={!hasScenarios}
        className="fixed bottom-6 right-6 h-12 px-5 shadow-lg rounded-full z-50 gap-2"
        title={hasScenarios ? 'Generate AI Summary' : 'Add scenarios first'}
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">Generate Summary</span>
      </Button>

      {/* Summary Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Deal Summary Generator
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Input Section - only show when no summary yet */}
            {!summary && !isGenerating && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Custom instructions (optional)
                  </label>
                  <Textarea
                    placeholder="e.g., Focus on multi-year savings, emphasize the bundling discount, highlight the partnership value..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="min-h-[80px] resize-none"
                    disabled={isGenerating}
                  />
                </div>
                
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating}
                  className="w-full gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Summary for "{dealName}"
                </Button>
              </div>
            )}

            {/* Loading State */}
            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p className="text-sm">Generating your deal summary...</p>
                <p className="text-xs mt-1">This may take a few seconds</p>
              </div>
            )}

            {/* Error State */}
            {error && !isGenerating && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <p className="text-sm text-destructive font-medium mb-2">Generation failed</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  className="mt-3"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Summary Output */}
            {summary && !isGenerating && (
              <div className="space-y-4">
                {/* Summary Content */}
                <div className="rounded-lg border bg-card p-4 sm:p-6">
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdown(summary),
                      }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleCopy} className="gap-2 flex-1 sm:flex-none">
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsOpen(false)}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Close
                  </Button>
                </div>

                {/* Edit prompt for regeneration */}
                <div className="pt-2 border-t">
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Adjust instructions for regeneration
                  </label>
                  <Textarea
                    placeholder="Add additional context or change the focus..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="min-h-[60px] resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Simple markdown to HTML converter for the summary output
 */
function formatMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet points
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive li elements in ul
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Paragraphs (lines not starting with < or empty)
    .replace(/^(?!<|$)(.+)$/gm, '<p>$1</p>')
    // Clean up extra newlines
    .replace(/\n{3,}/g, '\n\n');
}
