import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import { ScenarioDataRow, type ScenarioDataResult } from './comparison/ScenarioDataRow';
import { cn } from '@/lib/utils';
import type { Scenario, DisplayMode } from '@/lib/types';

interface ScenarioComparisonProps {
  scenarios: Scenario[];
  dealDisplayMode: DisplayMode;
}

export function ScenarioComparison({ scenarios, dealDisplayMode }: ScenarioComparisonProps) {
  const [view, setView] = useState<'summary' | 'detailed'>('summary');
  
  if (scenarios.length < 2) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Scenario Comparison</CardTitle>
          <Tabs value={view} onValueChange={(v) => setView(v as 'summary' | 'detailed')}>
            <TabsList className="h-8">
              <TabsTrigger value="summary" className="text-xs px-3">Summary</TabsTrigger>
              <TabsTrigger value="detailed" className="text-xs px-3">Detailed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {view === 'summary' ? (
          <ComparisonSummary scenarios={scenarios} dealDisplayMode={dealDisplayMode} />
        ) : (
          <ComparisonDetailed scenarios={scenarios} dealDisplayMode={dealDisplayMode} />
        )}
      </CardContent>
    </Card>
  );
}

interface ComparisonViewProps {
  scenarios: Scenario[];
  dealDisplayMode: DisplayMode;
}

function ComparisonSummary({ scenarios, dealDisplayMode }: ComparisonViewProps) {
  const isMonthly = dealDisplayMode === 'monthly';
  const periodLabel = isMonthly ? '/mo' : '/yr';

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm min-w-[400px]">
        <thead>
          <tr className="border-b border-divider">
            <th className="text-left py-2 pr-4 text-xs font-bold text-muted-foreground uppercase tracking-wide">Metric</th>
            {scenarios.map((scenario) => (
              <th key={scenario.id} className="text-right py-2 px-2 font-semibold text-foreground">
                {scenario.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <ComparisonSummaryRows 
            scenarios={scenarios} 
            dealDisplayMode={dealDisplayMode} 
            periodLabel={periodLabel}
            isMonthly={isMonthly}
          />
        </tbody>
      </table>
    </div>
  );
}

interface ComparisonSummaryRowsProps {
  scenarios: Scenario[];
  dealDisplayMode: DisplayMode;
  periodLabel: string;
  isMonthly: boolean;
}

function ComparisonSummaryRows({ scenarios, dealDisplayMode, periodLabel, isMonthly }: ComparisonSummaryRowsProps) {
  // Collect data from all scenarios using proper hook pattern
  const [scenarioData, setScenarioData] = useState<Map<string, ScenarioDataResult>>(new Map());
  
  // Metrics configuration
  const metrics = useMemo(() => [
    { 
      label: `List${periodLabel}`, 
      getValue: (d: ScenarioDataResult) => formatCurrency(isMonthly ? d.totals.listMonthly : d.totals.listAnnual),
      getNumValue: (d: ScenarioDataResult) => isMonthly ? d.totals.listMonthly : d.totals.listAnnual,
    },
    { 
      label: `Net${periodLabel}`, 
      getValue: (d: ScenarioDataResult) => formatCurrency(isMonthly ? d.totals.netMonthly : d.totals.netAnnual),
      getNumValue: (d: ScenarioDataResult) => isMonthly ? d.totals.netMonthly : d.totals.netAnnual,
      highlight: true,
    },
    { 
      label: 'Term Total', 
      getValue: (d: ScenarioDataResult) => formatCurrency(d.totals.netTerm),
      getNumValue: (d: ScenarioDataResult) => d.totals.netTerm,
    },
    { 
      label: 'Blended Discount', 
      getValue: (d: ScenarioDataResult) => formatPercent(d.totals.blendedDiscount),
      getNumValue: (d: ScenarioDataResult) => d.totals.blendedDiscount,
    },
    { 
      label: 'Total Savings', 
      getValue: (d: ScenarioDataResult) => formatCurrency(d.totals.totalSavings),
      getNumValue: (d: ScenarioDataResult) => d.totals.totalSavings,
      highlight: true,
    },
  ], [periodLabel, isMonthly]);

  // Calculate best values for highlighting
  const bestValues = useMemo(() => {
    const data = Array.from(scenarioData.values());
    if (data.length === 0) return metrics.map(() => 0);
    
    return metrics.map((metric) => {
      const values = data.map((d) => metric.getNumValue(d));
      return Math.max(...values);
    });
  }, [scenarioData, metrics]);

  return (
    <>
      {/* Render ScenarioDataRow components to collect data */}
      {scenarios.map((scenario) => (
        <ScenarioDataRow 
          key={scenario.id} 
          scenario={scenario} 
          dealDisplayMode={dealDisplayMode}
        >
          {(data) => {
            // Update collected data (side effect in render, but safe for display)
            if (!scenarioData.has(scenario.id) || 
                JSON.stringify(scenarioData.get(scenario.id)?.totals) !== JSON.stringify(data.totals)) {
              setScenarioData(prev => new Map(prev).set(scenario.id, data));
            }
            return null;
          }}
        </ScenarioDataRow>
      ))}
      
      {/* Render metric rows */}
      {metrics.map((metric, idx) => (
        <tr 
          key={metric.label} 
          className={cn(
            "border-b border-divider last:border-0 transition-colors hover:bg-muted/30",
            metric.highlight && "bg-accent-soft/10"
          )}
        >
          <td className="py-2.5 pr-4 text-muted-foreground font-medium">{metric.label}</td>
          {scenarios.map((scenario) => {
            const d = scenarioData.get(scenario.id);
            if (!d) {
              return <td key={scenario.id} className="text-right py-2.5 px-2 tabular-nums">—</td>;
            }
            
            const value = metric.getValue(d);
            const numValue = metric.getNumValue(d);
            const isBest = numValue === bestValues[idx] && scenarios.length > 1;
            
            return (
              <td 
                key={scenario.id} 
                className={cn(
                  "text-right py-2.5 px-2 tabular-nums",
                  metric.highlight && "font-semibold",
                  isBest && metric.highlight && "text-primary font-bold"
                )}
              >
                {value}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function ComparisonDetailed({ scenarios, dealDisplayMode }: ComparisonViewProps) {
  const [scenarioData, setScenarioData] = useState<Map<string, ScenarioDataResult>>(new Map());
  const isMonthly = dealDisplayMode === 'monthly';

  // Collect all unique product names across scenarios
  const productNames = useMemo(() => {
    const allProducts = new Set<string>();
    scenarioData.forEach(({ lineItems }) => {
      lineItems.forEach((item) => {
        if (item.product_name) {
          allProducts.add(item.product_name);
        }
      });
    });
    return Array.from(allProducts);
  }, [scenarioData]);

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      {/* Render ScenarioDataRow components to collect data */}
      {scenarios.map((scenario) => (
        <ScenarioDataRow 
          key={scenario.id} 
          scenario={scenario} 
          dealDisplayMode={dealDisplayMode}
        >
          {(data) => {
            if (!scenarioData.has(scenario.id) || 
                JSON.stringify(scenarioData.get(scenario.id)?.lineItems) !== JSON.stringify(data.lineItems)) {
              setScenarioData(prev => new Map(prev).set(scenario.id, data));
            }
            return null;
          }}
        </ScenarioDataRow>
      ))}
      
      {productNames.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-4">
          No products to compare.
        </p>
      ) : (
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr className="border-b border-divider">
              <th className="text-left py-2 pr-4 text-xs font-bold text-muted-foreground uppercase tracking-wide">Product</th>
              {scenarios.map((scenario) => (
                <th key={scenario.id} className="text-right py-2 px-2 font-semibold text-foreground" colSpan={2}>
                  {scenario.name}
                </th>
              ))}
            </tr>
            <tr className="border-b border-divider text-xs text-muted-foreground">
              <th className="text-left py-1.5 pr-4"></th>
              {scenarios.map((scenario) => (
                <React.Fragment key={scenario.id}>
                  <th className="text-right py-1.5 px-2 font-medium">Qty</th>
                  <th className="text-right py-1.5 px-2 font-medium">Net{isMonthly ? '/mo' : '/yr'}</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {productNames.map((product) => (
              <tr key={product} className="border-b border-divider last:border-0 transition-colors hover:bg-muted/30">
                <td className="py-2.5 pr-4 font-medium">{product}</td>
                {scenarios.map((scenario) => {
                  const data = scenarioData.get(scenario.id);
                  const item = data?.lineItems.find((li) => li.product_name === product);
                  
                  if (!item) {
                    return (
                      <React.Fragment key={scenario.id}>
                        <td className="text-right py-2.5 px-2 text-muted-foreground tabular-nums">—</td>
                        <td className="text-right py-2.5 px-2 text-muted-foreground tabular-nums">—</td>
                      </React.Fragment>
                    );
                  }
                  
                  const netUnit = item.net_unit_price ?? item.list_unit_price * (1 - (item.discount_percent ?? 0));
                  const netTotal = netUnit * item.quantity;
                  const displayNet = isMonthly ? netTotal : netTotal * 12;
                  
                  return (
                    <React.Fragment key={scenario.id}>
                      <td className="text-right py-2.5 px-2 tabular-nums">{item.quantity}</td>
                      <td className="text-right py-2.5 px-2 font-semibold tabular-nums">
                        {formatCurrency(displayNet)}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
