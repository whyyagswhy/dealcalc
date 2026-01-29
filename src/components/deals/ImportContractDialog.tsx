import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileImage, Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExtractedLineItem {
  product_name: string;
  list_unit_price: number;
  quantity: number;
  term_months: number;
  discount_percent: number | null;
  net_unit_price: number | null;
}

interface ExtractionResult {
  line_items: ExtractedLineItem[];
  confidence: string;
  notes: string;
}

interface ImportContractDialogProps {
  dealId: string;
  onImportComplete: (lineItems: ExtractedLineItem[]) => Promise<void>;
}

export function ImportContractDialog({ dealId, onImportComplete }: ImportContractDialogProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be less than 10MB');
      return;
    }

    setError(null);
    setResult(null);

    // Create preview and base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleExtract = async () => {
    if (!preview) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('extract-contract', {
        body: { image_base64: preview },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to process image');
      }

      if (!data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      setResult(data.data);
      
      if (data.data.line_items.length === 0) {
        setError('No line items could be extracted from this image. Try a clearer screenshot.');
      }
    } catch (err) {
      console.error('Extraction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract contract data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!result || result.line_items.length === 0) return;

    setIsProcessing(true);
    try {
      await onImportComplete(result.line_items);
      toast({
        title: 'Contract imported',
        description: `Created "Current Contract" scenario with ${result.line_items.length} line items`,
      });
      handleClose();
    } catch (err) {
      console.error('Import error:', err);
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Failed to create scenario',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[confidence as keyof typeof colors] || colors.medium;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-[44px]">
          <FileImage className="mr-2 h-4 w-4" />
          Import Contract
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contract Screenshot</DialogTitle>
          <DialogDescription>
            Upload a screenshot of an existing contract to automatically extract line items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="flex flex-col items-center justify-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="contract-image-upload"
            />
            
            {!preview ? (
              <label
                htmlFor="contract-image-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload contract screenshot</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
              </label>
            ) : (
              <div className="w-full space-y-3">
                <div className="relative">
                  <img
                    src={preview}
                    alt="Contract preview"
                    className="w-full max-h-64 object-contain rounded-lg border border-border"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setPreview(null);
                      setResult(null);
                      setError(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Change
                  </Button>
                </div>

                {!result && !isProcessing && (
                  <Button onClick={handleExtract} className="w-full" disabled={isProcessing}>
                    <FileImage className="mr-2 h-4 w-4" />
                    Extract Line Items
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Processing State */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {result ? 'Creating scenario...' : 'Analyzing contract...'}
              </span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Extraction Result */}
          {result && result.line_items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-medium">
                    Found {result.line_items.length} line item{result.line_items.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(result.confidence)}`}>
                  {result.confidence} confidence
                </span>
              </div>

              {result.notes && (
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded">{result.notes}</p>
              )}

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Product</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">List $/mo</th>
                      <th className="px-3 py-2 text-right font-medium">Net $/mo</th>
                      <th className="px-3 py-2 text-right font-medium">Term</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.line_items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">{item.product_name}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">${item.list_unit_price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">
                          {item.net_unit_price != null ? `$${item.net_unit_price.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-right">{item.term_months}mo</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          {result && result.line_items.length > 0 && (
            <Button onClick={handleImport} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Import as "Current Contract"
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
