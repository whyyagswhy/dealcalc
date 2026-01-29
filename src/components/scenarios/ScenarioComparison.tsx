import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent, calculateScenarioTotals } from '@/lib/calculations';
import { useLineItems } from '@/hooks/useLineItems';
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
    <Card className="border-primary/30 bg-primary/5">
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Metric</th>
            {scenarios.map((scenario) => (
              <th key={scenario.id} className="text-right py-2 px-2 font-medium">
                {scenario.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scenarios.length > 0 && (
            <ComparisonRows scenarios={scenarios} dealDisplayMode={dealDisplayMode} />
          )}
        </tbody>
      </table>
    </div>
  );
}

function ComparisonRows({ scenarios, dealDisplayMode }: ComparisonViewProps) {
  // Fetch line items for each scenario
  const scenarioData = scenarios.map((scenario) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: lineItems = [] } = useLineItems(scenario.id);
    const displayMode = scenario.display_override ?? dealDisplayMode;
    const totals = calculateScenarioTotals(lineItems);
    return { scenario, lineItems, displayMode, totals };
  });

  const isMonthly = dealDisplayMode === 'monthly';
  const periodLabel = isMonthly ? '/mo' : '/yr';

  const metrics = [
    { 
      label: `List${periodLabel}`, 
      getValue: (d: typeof scenarioData[0]) => formatCurrency(isMonthly ? d.totals.listMonthly : d.totals.listAnnual) 
    },
    { 
      label: `Net${periodLabel}`, 
      getValue: (d: typeof scenarioData[0]) => formatCurrency(isMonthly ? d.totals.netMonthly : d.totals.netAnnual),
      highlight: true,
    },
    { 
      label: 'Term Total', 
      getValue: (d: typeof scenarioData[0]) => formatCurrency(d.totals.netTerm),
    },
    { 
      label: 'Blended Discount', 
      getValue: (d: typeof scenarioData[0]) => formatPercent(d.totals.blendedDiscount),
    },
    { 
      label: 'Total Savings', 
      getValue: (d: typeof scenarioData[0]) => formatCurrency(d.totals.totalSavings),
      highlight: true,
    },
  ];

  // Find best values for highlighting
  const bestValues = metrics.map((metric) => {
    const values = scenarioData.map((d) => {
      if (metric.label === 'Blended Discount' || metric.label === 'Total Savings') {
        return metric.label === 'Blended Discount' 
          ? d.totals.blendedDiscount 
          : d.totals.totalSavings;
      }
      return d.totals.netTerm;
    });
    return Math.max(...values);
  });

  return (
    <>
      {metrics.map((metric, idx) => (
        <tr key={metric.label} className="border-b border-border/50 last:border-0">
          <td className="py-2 pr-4 text-muted-foreground">{metric.label}</td>
          {scenarioData.map((d) => {
            const value = metric.getValue(d);
            const numValue = metric.label === 'Blended Discount' 
              ? d.totals.blendedDiscount 
              : metric.label === 'Total Savings' 
                ? d.totals.totalSavings 
                : d.totals.netTerm;
            const isBest = numValue === bestValues[idx] && scenarioData.length > 1;
            
            return (
              <td 
                key={d.scenario.id} 
                className={cn(
                  "text-right py-2 px-2",
                  metric.highlight && "font-medium",
                  isBest && metric.highlight && "text-primary font-semibold"
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
  // Collect all unique product names across scenarios
  const scenarioData = scenarios.map((scenario) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: lineItems = [] } = useLineItems(scenario.id);
    return { scenario, lineItems };
  });

  const allProducts = new Set<string>();
  scenarioData.forEach(({ lineItems }) => {
    lineItems.forEach((item) => {
      if (item.product_name) {
        allProducts.add(item.product_name);
      }
    });
  });

  const productNames = Array.from(allProducts);
  const isMonthly = dealDisplayMode === 'monthly';

  if (productNames.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-4">
        No products to compare.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Product</th>
            {scenarios.map((scenario) => (
              <th key={scenario.id} className="text-right py-2 px-2 font-medium" colSpan={2}>
                {scenario.name}
              </th>
            ))}
          </tr>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="text-left py-1 pr-4"></th>
            {scenarios.map((scenario) => (
              <>
                <th key={`${scenario.id}-qty`} className="text-right py-1 px-2">Qty</th>
                <th key={`${scenario.id}-net`} className="text-right py-1 px-2">Net{isMonthly ? '/mo' : '/yr'}</th>
              </>
            ))}
          </tr>
        </thead>
        <tbody>
          {productNames.map((product) => (
            <tr key={product} className="border-b border-border/50 last:border-0">
              <td className="py-2 pr-4">{product}</td>
              {scenarioData.map(({ scenario, lineItems }) => {
                const item = lineItems.find((li) => li.product_name === product);
                if (!item) {
                  return (
                    <>
                      <td key={`${scenario.id}-${product}-qty`} className="text-right py-2 px-2 text-muted-foreground">—</td>
                      <td key={`${scenario.id}-${product}-net`} className="text-right py-2 px-2 text-muted-foreground">—</td>
                    </>
                  );
                }
                const netUnit = item.net_unit_price ?? item.list_unit_price * (1 - (item.discount_percent ?? 0));
                const netTotal = netUnit * item.quantity;
                const displayNet = isMonthly ? netTotal : netTotal * 12;
                
                return (
                  <>
                    <td key={`${scenario.id}-${product}-qty`} className="text-right py-2 px-2">{item.quantity}</td>
                    <td key={`${scenario.id}-${product}-net`} className="text-right py-2 px-2 font-medium">
                      {formatCurrency(displayNet)}
                    </td>
                  </>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
