
# Plan: Improve KPI Banner UI and Conditional Display Logic

## Summary
Refactor the ScenarioSummary KPI banner to fix visual issues, conditionally show Incremental ACV only when existing volume data exists, rename "Comm. ACV" to "Incremental ACV", and add annual/term costs plus savings to the customer-facing view.

---

## Changes Overview

### 1. Fix Visual Issues in KPI Banner
**Problem**: Values are truncated/overlapping when numbers get large (e.g., "$262,500" barely fits)

**Solution**:
- Reduce font sizes slightly for better fit
- Add responsive text sizing that scales down on narrower cards
- Improve spacing and ensure `whitespace-nowrap` prevents mid-word breaks
- Use 3-column grid for primary row on small screens to prevent crowding

### 2. Rename "Comm. ACV" → "Incremental ACV"
**Location**: `ScenarioSummary.tsx` line 77

**Change**:
```text
Before: "Comm. ACV"
After:  "Incr. ACV"
```

### 3. Conditionally Show Incremental ACV
**Logic**: Only display the Incremental ACV row if any line item has existing volume data entered (`totalExistingAnnual > 0`)

**Current behavior**: Always shows both "Comm. ACV" and "Total ACV" in internal view
**New behavior**: 
- If no existing volume data: Show only "Total ACV" (since Incremental = Total in this case)
- If existing volume data exists: Show both "Incr. ACV" and "Total ACV"

### 4. Customer View: Add Annual, Term, and Savings KPIs
**Current customer view shows**: List/mo, Net/mo, Discount, Term Total (4 items)

**New customer view will show** (2 rows):
- **Row 1**: Annual Cost, Term Cost, Discount
- **Row 2**: Annual Savings, Term Savings

This gives customers clear visibility into their actual costs and savings without internal metrics.

---

## Technical Implementation

### File: `src/components/scenarios/ScenarioSummary.tsx`

#### Props Enhancement
Add `enableExistingVolume` prop to know whether to check for baseline data:

```typescript
interface ScenarioSummaryProps {
  lineItems: LineItem[];
  displayMode: DisplayMode;
  viewMode: ViewMode;
  className?: string;
}
```

#### Internal View Logic
```typescript
// Only show Incremental ACV if there's actual existing volume data
const hasExistingVolumeData = totals.totalExistingAnnual > 0;

{isInternal && hasExistingVolumeData && (
  <div className="grid grid-cols-2 gap-4">
    <KpiBlock label="Incr. ACV" value={formatCurrency(totals.totalCommissionableACV)} />
    <KpiBlock label="Total ACV" value={formatCurrency(totals.totalACV)} />
  </div>
)}

{isInternal && !hasExistingVolumeData && (
  <div className="flex justify-center">
    <KpiBlock label="Total ACV" value={formatCurrency(totals.totalACV)} />
  </div>
)}
```

#### Customer View Layout
```typescript
{!isInternal && (
  <>
    {/* Row 1: Costs */}
    <div className="grid grid-cols-3 gap-4">
      <KpiBlock label="Annual" value={formatCurrency(totals.netAnnual)} />
      <KpiBlock label="Term Cost" value={formatCurrency(totals.netTerm)} />
      <KpiBlock label="Discount" value={formatPercent(totals.blendedDiscount)} />
    </div>
    
    {/* Row 2: Savings */}
    <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/20">
      <KpiBlock label="Annual Savings" value={formatCurrency(annualSavings)} />
      <KpiBlock label="Term Savings" value={formatCurrency(totals.totalSavings)} />
    </div>
  </>
)}
```

#### Calculations to Add
```typescript
// Calculate annual savings (list - net annual)
const annualSavings = totals.listAnnual - totals.netAnnual;
```

#### Visual Improvements to KpiBlock
```typescript
function KpiBlock({ label, value, size = 'normal' }: { 
  label: string; 
  value: string; 
  size?: 'normal' | 'compact';
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className={cn(
        "font-semibold text-white/80 uppercase tracking-wider whitespace-nowrap",
        size === 'compact' ? "text-[9px]" : "text-[10px] sm:text-xs"
      )}>
        {label}
      </span>
      <span className={cn(
        "font-bold text-white tabular-nums whitespace-nowrap",
        size === 'compact' ? "text-base sm:text-lg" : "text-lg sm:text-xl"
      )}>
        {value}
      </span>
    </div>
  );
}
```

---

## KPI Display Summary

| View | Row 1 | Row 2 |
|------|-------|-------|
| **Internal (no existing volume)** | List, Net, Discount, Term Total | Total ACV (centered) |
| **Internal (with existing volume)** | List, Net, Discount, Term Total | Incr. ACV, Total ACV |
| **Customer** | Annual, Term Cost, Discount | Annual Savings, Term Savings |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/scenarios/ScenarioSummary.tsx` | Main refactor: conditional Incremental ACV, customer view savings, visual fixes |

---

## Testing Criteria

1. **Internal view without existing volume**: Shows List/mo, Net/mo, Discount, Term Total on row 1, centered "Total ACV" on row 2
2. **Internal view with existing volume entered on an Add-on line**: Shows both "Incr. ACV" and "Total ACV" on row 2
3. **Customer view**: Shows Annual, Term Cost, Discount on row 1; Annual Savings, Term Savings on row 2
4. **Large values don't truncate**: $262,500 and similar values display fully without ellipsis
5. **Responsive**: Layout adjusts cleanly on mobile without overlapping
