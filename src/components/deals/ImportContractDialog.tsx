import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { FileImage, Upload, Loader2, AlertCircle, CheckCircle2, Trash2, Plus, AlertTriangle, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ExtractedLineItem {
  product_name: string;
  list_unit_price: number;
  quantity: number;
  term_months: number;
  discount_percent: number | null;
  net_unit_price: number | null;
  // Matching fields
  original_product_name?: string;
  matched_product_name?: string | null;
  matched_list_price?: number | null;
  match_confidence?: 'high' | 'medium' | 'low' | 'none';
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
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [editableItems, setEditableItems] = useState<ExtractedLineItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdfFile = file.type === 'application/pdf';
    
    if (!isImage && !isPdfFile) {
      setError('Please select an image (PNG, JPG) or PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setExtractionResult(null);
    setEditableItems([]);
    setFileName(file.name);
    setIsPdf(isPdfFile);

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
        body: { file_base64: preview },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to process image');
      }

      if (!data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      setExtractionResult(data.data);
      setEditableItems([...data.data.line_items]);
      
      if (data.data.line_items.length === 0) {
        setError('No line items could be extracted from this image. Try a clearer screenshot.');
      } else {
        // Count matched products
        const matchedCount = data.data.line_items.filter(
          (item: ExtractedLineItem) => item.match_confidence && item.match_confidence !== 'none'
        ).length;
        if (matchedCount > 0) {
          toast({
            title: 'Products matched',
            description: `${matchedCount} of ${data.data.line_items.length} products matched to price book`,
          });
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Extraction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract contract data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateItem = (index: number, field: keyof ExtractedLineItem, value: string | number | null) => {
    setEditableItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteItem = (index: number) => {
    setEditableItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    setEditableItems(prev => [
      ...prev,
      {
        product_name: '',
        list_unit_price: 0,
        quantity: 1,
        term_months: 12,
        discount_percent: null,
        net_unit_price: null,
        match_confidence: 'none',
      },
    ]);
  };

  const handleImport = async () => {
    if (editableItems.length === 0) return;

    const invalidItems = editableItems.filter(item => !item.product_name.trim());
    if (invalidItems.length > 0) {
      setError('All line items must have a product name');
      return;
    }

    setIsProcessing(true);
    try {
      await onImportComplete(editableItems);
      toast({
        title: 'Contract imported',
        description: `Created "Current Contract" scenario with ${editableItems.length} line items`,
      });
      handleClose();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Import error:', err);
      toast({
        title: 'Import failed',
        description: 'Failed to create scenario. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPreview(null);
    setFileName(null);
    setIsPdf(false);
    setExtractionResult(null);
    setEditableItems([]);
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

  const getMatchIcon = (confidence?: 'high' | 'medium' | 'low' | 'none') => {
    if (!confidence || confidence === 'none') {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          </TooltipTrigger>
          <TooltipContent>
            <p>No price book match found</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    
    const colors = {
      high: 'text-green-600',
      medium: 'text-blue-600',
      low: 'text-amber-600',
    };
    
    const labels = {
      high: 'Exact match',
      medium: 'Likely match',
      low: 'Possible match',
    };
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Check className={cn('h-4 w-4 shrink-0', colors[confidence])} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{labels[confidence]}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  const parseNumber = (value: string): number => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const parseNullableNumber = (value: string): number | null => {
    if (value === '' || value === '-') return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-[44px]">
          <FileImage className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Import Contract</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contract Screenshot</DialogTitle>
          <DialogDescription>
            Upload a screenshot of an existing contract to automatically extract and match line items to the price book.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="flex flex-col items-center justify-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
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
                <p className="text-sm text-muted-foreground">Click to upload contract</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or PDF up to 10MB</p>
              </label>
            ) : (
              <div className="w-full space-y-3">
                <div className="relative">
                  {isPdf ? (
                    <div className="flex flex-col items-center justify-center w-full h-32 bg-muted rounded-lg border border-border">
                      <FileImage className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">{fileName}</p>
                      <p className="text-xs text-muted-foreground">PDF Document</p>
                    </div>
                  ) : (
                    <img
                      src={preview}
                      alt="Contract preview"
                      className="w-full max-h-48 object-contain rounded-lg border border-border"
                    />
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setPreview(null);
                      setFileName(null);
                      setIsPdf(false);
                      setExtractionResult(null);
                      setEditableItems([]);
                      setError(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Change
                  </Button>
                </div>

                {editableItems.length === 0 && !isProcessing && (
                  <Button onClick={handleExtract} className="w-full" disabled={isProcessing}>
                    <FileImage className="mr-2 h-4 w-4" />
                    Extract & Match Products
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
                {editableItems.length > 0 ? 'Creating scenario...' : 'Extracting and matching products...'}
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

          {/* Editable Extraction Result */}
          <TooltipProvider>
            {editableItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium">
                      {editableItems.length} line item{editableItems.length !== 1 ? 's' : ''}
                    </span>
                    {editableItems.some(i => i.match_confidence && i.match_confidence !== 'none') && (
                      <span className="text-sm text-muted-foreground">
                        ({editableItems.filter(i => i.match_confidence && i.match_confidence !== 'none').length} matched)
                      </span>
                    )}
                  </div>
                  {extractionResult && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceBadge(extractionResult.confidence)}`}>
                      {extractionResult.confidence} confidence
                    </span>
                  )}
                </div>

                {extractionResult?.notes && (
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded">{extractionResult.notes}</p>
                )}

                <p className="text-sm text-muted-foreground">
                  Review the matched products below. <Check className="inline h-3 w-3 text-green-600" /> indicates a price book match.
                </p>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-1 py-2 w-6"></th>
                        <th className="px-2 py-2 text-left font-medium">Product</th>
                        <th className="px-2 py-2 text-right font-medium w-16">Qty</th>
                        <th className="px-2 py-2 text-right font-medium w-24">List $/mo</th>
                        <th className="px-2 py-2 text-right font-medium w-24">Net $/mo</th>
                        <th className="px-2 py-2 text-right font-medium w-16">Term</th>
                        <th className="px-2 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {editableItems.map((item, idx) => (
                        <tr key={idx} className="group">
                          <td className="px-1 py-1 text-center">
                            {getMatchIcon(item.match_confidence)}
                          </td>
                          <td className="px-2 py-1">
                            <div className="space-y-0.5">
                              <Input
                                value={item.product_name}
                                onChange={(e) => handleUpdateItem(idx, 'product_name', e.target.value)}
                                className="h-8 text-sm"
                                placeholder="Product name"
                              />
                              {item.original_product_name && item.original_product_name !== item.product_name && (
                                <p className="text-xs text-muted-foreground truncate" title={item.original_product_name}>
                                  Original: {item.original_product_name}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                              className="h-8 text-sm text-right w-16"
                              min={1}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <div className="space-y-0.5">
                              <Input
                                type="number"
                                value={item.list_unit_price}
                                onChange={(e) => handleUpdateItem(idx, 'list_unit_price', parseNumber(e.target.value))}
                                className={cn(
                                  "h-8 text-sm text-right w-24",
                                  item.matched_list_price !== null && item.matched_list_price !== undefined && "border-green-300"
                                )}
                                step="0.01"
                                min={0}
                              />
                              {item.matched_list_price !== null && item.matched_list_price !== undefined && (
                                <p className="text-xs text-green-600 text-right">
                                  from price book
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="number"
                              value={item.net_unit_price ?? ''}
                              onChange={(e) => handleUpdateItem(idx, 'net_unit_price', parseNullableNumber(e.target.value))}
                              className="h-8 text-sm text-right w-24"
                              step="0.01"
                              min={0}
                              placeholder="-"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Input
                              type="number"
                              value={item.term_months}
                              onChange={(e) => handleUpdateItem(idx, 'term_months', parseInt(e.target.value) || 12)}
                              className="h-8 text-sm text-right w-16"
                              min={1}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(idx)}
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line Item
                </Button>
              </div>
            )}
          </TooltipProvider>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          {editableItems.length > 0 && (
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
