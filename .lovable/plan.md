
# Mobile UI Improvements Plan

## Problem Analysis
Looking at the screenshot, the Deal Detail page has several mobile layout issues:
1. The header is overcrowded - too many controls fighting for horizontal space
2. The deal name field is not visible (likely squeezed out)
3. Toggle buttons (Monthly/Annual, Internal/Customer) take up too much space on small screens
4. The toolbar controls don't adapt well to narrow viewports

---

## Solution: Two-Row Mobile Header

Restructure the header to use a stacked layout on mobile devices:

```text
CURRENT (broken):
+---------------------------------------------------+
| ← | [Deal Name...] | [Import] [M|A] [I|C] ⋮       |
+---------------------------------------------------+

PROPOSED:
+---------------------------------------------------+
| ← Back                             [Import] ⋮     |  <- Row 1: Navigation
|---------------------------------------------------|
| Deal Name                              [Saved]    |  <- Row 2: Title
|---------------------------------------------------|
| [Monthly|Annual]    [Internal|Customer]           |  <- Row 3: Toggles
+---------------------------------------------------+
```

---

## Implementation Details

### 1. Restructure DealDetail.tsx Header (Mobile Layout)

The header will conditionally render a different structure on mobile:

**Mobile (< 640px):**
- Row 1: Back button + Import Contract (icon only) + Overflow menu
- Row 2: Full-width deal name input with save indicator
- Row 3: Display toggles (Monthly/Annual and Internal/Customer) spanning full width

**Desktop (>= 640px):**
- Keep the current single-row layout (it works fine)

### 2. Update DealToolbar.tsx

Modify the mobile version to optionally render toggles as a full-width row (passed as a separate render prop or flag) rather than inline with other controls.

### 3. Update ImportContractDialog.tsx

On mobile, show only the icon (no "Import Contract" text) to save space.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/DealDetail.tsx` | Restructure header with mobile-specific stacked layout using `useIsMobile` hook |
| `src/components/deals/DealToolbar.tsx` | Add option to render toggles as standalone full-width row for mobile |
| `src/components/deals/ImportContractDialog.tsx` | Hide button text on mobile, show only icon |

---

## Technical Approach

### DealDetail.tsx Changes

```tsx
// Import the mobile hook
import { useIsMobile } from '@/hooks/use-mobile';

// In the header section, use conditional rendering:
{isMobile ? (
  // Stacked mobile layout
  <header className="border-b border-border bg-card shadow-card">
    {/* Row 1: Navigation */}
    <div className="flex items-center justify-between px-4 py-2">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      <div className="flex items-center gap-2">
        <ImportContractDialog dealId={dealId!} onImportComplete={handleImportContract} />
        {/* Overflow menu only */}
      </div>
    </div>
    
    {/* Row 2: Deal Name */}
    <div className="flex items-center gap-2 px-4 py-2 border-t border-border/50">
      <Input value={dealName} onChange={...} className="flex-1 text-lg font-semibold" />
      <SaveStatusIndicator status={status} onRetry={retry} />
    </div>
    
    {/* Row 3: Toggles */}
    <div className="flex items-center justify-between px-4 py-2 border-t border-border/50">
      <DisplayModeToggle ... />
      <ViewModeToggle ... />
    </div>
  </header>
) : (
  // Existing desktop layout
  <header>...</header>
)}
```

### DealToolbar.tsx Changes

Create a simplified mobile variant that only shows the overflow menu (since toggles are now rendered separately in the header):

```tsx
if (isMobile) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* Existing Volume toggle */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### ImportContractDialog.tsx Changes

Make the trigger button responsive:

```tsx
<Button variant="outline" size="sm" className="min-h-[44px]">
  <FileImage className="h-4 w-4" />
  <span className="hidden sm:inline ml-2">Import Contract</span>
</Button>
```

---

## Additional Refinements

1. **Floating Action Button**: Move it slightly higher on mobile to avoid conflict with browser navigation bars (`bottom-20` instead of `bottom-6` on mobile)

2. **Touch targets**: Ensure all interactive elements maintain the 44px minimum touch target size

3. **Horizontal scrolling prevention**: Add `overflow-x-hidden` to the header container to prevent any accidental horizontal scroll

---

## Summary of Changes

| Component | Current Issue | Fix |
|-----------|---------------|-----|
| DealDetail header | Single crowded row | Split into 3 rows on mobile |
| Deal name input | Hidden/squeezed | Dedicated full-width row |
| Toggles | Cramped inline | Full-width row at bottom of header |
| Import button | Text takes space | Icon-only on mobile |
| Overflow menu | Works | Keep as-is |
| FAB | May overlap navigation | Adjust position on mobile |

This restructuring follows mobile-first principles and matches the existing design system while dramatically improving usability on phones.
