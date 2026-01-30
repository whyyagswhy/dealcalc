

# Make Settings Toggles More Accessible

## Current State
The deal settings (Display Mode, View Mode, Existing Volume toggle) are hidden inside a popover that requires clicking a "Settings" button. This creates unnecessary friction since these are frequently-used controls.

## Proposed Solution
Surface the most commonly used toggles directly in the header toolbar, keeping the layout clean while making controls immediately accessible.

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  ← Back   │  Deal Name ○                        │ [Monthly|Annual] [Internal|Customer] │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Desktop Layout
- **Display Mode Toggle** (Monthly/Annual) - pill-style toggle visible in header
- **View Mode Toggle** (Internal/Customer) - pill-style toggle visible in header  
- **Existing Volume** switch - moved to a subtle overflow menu (⋮) since it's less frequently used

### Mobile Layout  
- On screens < 768px, collapse toggles into a slim toolbar row below the header
- Use compact icons with labels to save horizontal space

---

## Implementation Details

### 1. Create ViewModeToggle Component
New pill-style toggle matching existing `DisplayModeToggle` pattern:
- "Internal" and "Customer" options
- Same styling with rounded-full container and active state highlighting

### 2. Create DealToolbar Component
New component that houses the inline toggles:
- DisplayModeToggle (already exists)
- ViewModeToggle (new)
- Optional overflow menu for Existing Volume toggle

### 3. Update DealDetail Page
- Replace `DealSettings` popover with inline `DealToolbar`
- Handle responsive layout with Tailwind breakpoints
- Keep ImportContractDialog button in same position

### 4. Responsive Behavior
- Desktop: toggles inline in header row
- Mobile: toggles stack in a secondary row below deal name

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/deals/ViewModeToggle.tsx` | Create new pill-style toggle for Internal/Customer |
| `src/components/deals/DealToolbar.tsx` | Create toolbar with toggles and overflow menu |
| `src/pages/DealDetail.tsx` | Replace DealSettings with DealToolbar |
| `src/components/deals/DealSettings.tsx` | Delete or refactor to overflow-only |

---

## Visual Design
Following existing patterns from project knowledge:
- **Pill-style toggles**: rounded-full container, solid primary for active segment
- **Touch targets**: 44px minimum height
- **Colors**: Deep indigo for active states, muted for inactive

