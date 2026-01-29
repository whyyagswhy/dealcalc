import { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, Loader2 } from 'lucide-react';
import type { Deal, Scenario, LineItem, DisplayMode, ViewMode } from '@/lib/types';
import { ScenarioSummary } from '@/components/scenarios/ScenarioSummary';
import { LineItemReadOnly } from '@/components/scenarios/LineItemReadOnly';
import { formatCurrency, formatPercent, calculateScenarioTotals } from '@/lib/calculations';

interface ExportDialogProps {
  deal: Deal;
  scenarios: Scenario[];
  lineItemsByScenario: Record<string, LineItem[]>;
}

export function ExportDialog({ deal, scenarios, lineItemsByScenario }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string>>(
    new Set(scenarios.map(s => s.id))
  );
  const [exportType, setExportType] = useState<'png' | 'csv'>('png');
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const toggleScenario = (scenarioId: string) => {
    setSelectedScenarioIds(prev => {
      const next = new Set(prev);
      if (next.has(scenarioId)) {
        next.delete(scenarioId);
      } else {
        next.add(scenarioId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedScenarioIds(new Set(scenarios.map(s => s.id)));
  };

  const selectNone = () => {
    setSelectedScenarioIds(new Set());
  };

  const getFilename = (extension: string) => {
    const date = new Date().toISOString().split('T')[0];
    const viewLabel = deal.view_mode === 'customer' ? 'Customer' : 'Internal';
    return `${deal.name} - ${viewLabel} - ${date}.${extension}`;
  };

  const handleExportPNG = useCallback(async () => {
    if (!exportRef.current || selectedScenarioIds.size === 0) return;
    
    setIsExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      
      const link = document.createElement('a');
      link.download = getFilename('png');
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export PNG:', error);
    } finally {
      setIsExporting(false);
    }
  }, [selectedScenarioIds, deal.name, deal.view_mode]);

  const handleExportCSV = useCallback(() => {
    const selectedScenarios = scenarios.filter(s => selectedScenarioIds.has(s.id));
    if (selectedScenarios.length === 0) return;

    const isInternal = deal.view_mode === 'internal';
    
    // Build CSV header
    const baseHeaders = [
      'Deal Name', 'Scenario Name', 'Product Name', 
      'List Unit Price/mo', 'Quantity', 'Term Months',
      'Discount %', 'Net Unit Price/mo',
      'List Monthly', 'Net Monthly', 'List Annual', 'Net Annual',
      'List Term', 'Net Term'
    ];
    
    const internalHeaders = isInternal 
      ? ['Revenue Type', 'Existing Volume', 'Existing Net Price/mo', 'Existing Term Months', 'Commissionable ACV']
      : [];
    
    const headers = [...baseHeaders, ...internalHeaders];
    
    const rows: string[][] = [];
    rows.push(headers);
    
    for (const scenario of selectedScenarios) {
      const lineItems = lineItemsByScenario[scenario.id] || [];
      const totals = calculateScenarioTotals(lineItems);
      
      for (const item of lineItems) {
        const netUnitPrice = item.net_unit_price ?? 
          (item.list_unit_price * (1 - (item.discount_percent ?? 0)));
        const listMonthly = item.list_unit_price * item.quantity;
        const netMonthly = netUnitPrice * item.quantity;
        
        const baseRow = [
          deal.name,
          scenario.name,
          item.product_name,
          item.list_unit_price.toString(),
          item.quantity.toString(),
          item.term_months.toString(),
          ((item.discount_percent ?? 0) * 100).toFixed(1),
          netUnitPrice.toFixed(2),
          listMonthly.toFixed(2),
          netMonthly.toFixed(2),
          (listMonthly * 12).toFixed(2),
          (netMonthly * 12).toFixed(2),
          (listMonthly * item.term_months).toFixed(2),
          (netMonthly * item.term_months).toFixed(2),
        ];
        
        const internalRow = isInternal ? [
          item.revenue_type,
          item.existing_volume?.toString() ?? '',
          item.existing_net_price?.toFixed(2) ?? '',
          item.existing_term_months?.toString() ?? '',
          item.revenue_type === 'add_on' 
            ? Math.max((netMonthly * 12) - ((item.existing_net_price ?? 0) * (item.existing_volume ?? 0) * 12), 0).toFixed(2)
            : (netMonthly * 12).toFixed(2),
        ] : [];
        
        rows.push([...baseRow, ...internalRow]);
      }
      
      // Add scenario totals row
      const totalsBaseRow = [
        deal.name,
        `${scenario.name} - TOTALS`,
        '',
        '', '', '',
        (totals.blendedDiscount * 100).toFixed(1),
        '',
        totals.listMonthly.toFixed(2),
        totals.netMonthly.toFixed(2),
        totals.listAnnual.toFixed(2),
        totals.netAnnual.toFixed(2),
        totals.listTerm.toFixed(2),
        totals.netTerm.toFixed(2),
      ];
      
      const totalsInternalRow = isInternal ? [
        '',
        '', '', '',
        totals.totalCommissionableACV.toFixed(2),
      ] : [];
      
      rows.push([...totalsBaseRow, ...totalsInternalRow]);
      rows.push([]); // Empty row between scenarios
    }
    
    // Convert to CSV
    const csvContent = rows.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = getFilename('csv');
    link.click();
    URL.revokeObjectURL(link.href);
  }, [scenarios, selectedScenarioIds, lineItemsByScenario, deal]);

  const selectedScenarios = scenarios.filter(s => selectedScenarioIds.has(s.id));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Deal</DialogTitle>
          <DialogDescription>
            Choose scenarios and export format.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Scenario Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Scenarios</Label>
              <div className="space-x-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>All</Button>
                <Button variant="ghost" size="sm" onClick={selectNone}>None</Button>
              </div>
            </div>
            <div className="grid gap-2">
              {scenarios.map(scenario => (
                <div key={scenario.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={scenario.id}
                    checked={selectedScenarioIds.has(scenario.id)}
                    onCheckedChange={() => toggleScenario(scenario.id)}
                  />
                  <Label htmlFor={scenario.id} className="text-sm font-normal">
                    {scenario.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Export Type */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="png"
                  checked={exportType === 'png'}
                  onCheckedChange={() => setExportType('png')}
                />
                <Label htmlFor="png" className="text-sm font-normal">PNG Image</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="csv"
                  checked={exportType === 'csv'}
                  onCheckedChange={() => setExportType('csv')}
                />
                <Label htmlFor="csv" className="text-sm font-normal">CSV Spreadsheet</Label>
              </div>
            </div>
          </div>
          
          {/* PNG Preview (off-screen render container) */}
          {exportType === 'png' && selectedScenarios.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div ref={exportRef} className="bg-background p-6" style={{ minWidth: '800px' }}>
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-foreground">{deal.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {deal.display_mode === 'monthly' ? 'Monthly' : 'Annual'} View • 
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
                
                <div className="space-y-8">
                  {selectedScenarios.map(scenario => {
                    const lineItems = lineItemsByScenario[scenario.id] || [];
                    return (
                      <div key={scenario.id} className="border-t pt-4">
                        <h2 className="text-lg font-semibold text-foreground mb-3">{scenario.name}</h2>
                        <ScenarioSummary
                          lineItems={lineItems}
                          displayMode={scenario.display_override ?? deal.display_mode}
                          viewMode={deal.view_mode}
                        />
                        <div className="mt-3 space-y-2">
                          {lineItems.map(lineItem => (
                            <LineItemReadOnly
                              key={lineItem.id}
                              lineItem={lineItem}
                              displayMode={scenario.display_override ?? deal.display_mode}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={exportType === 'png' ? handleExportPNG : handleExportCSV}
            disabled={selectedScenarioIds.size === 0 || isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {exportType.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
