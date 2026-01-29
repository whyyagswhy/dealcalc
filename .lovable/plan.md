
# Fix Card Layout and KPI Banner

## Problem Summary

Two related issues are causing the UI to look cramped and broken:

1. **Cards are too small**: ScenarioCard has a max-width of 680px (via `sm:max-w-scenario`), making cards occupy only a small portion of larger windows
2. **KPI banner overlaps**: The horizontal flex layout inside the banner breaks when the card is narrow, causing text to overlap

## Solution

### 1. Expand Card Width

Currently: `sm:min-w-[400px] sm:max-w-scenario` (400-680px)

Change to: Remove the max-width constraint so cards can grow to fill available space, while keeping a sensible minimum. On larger screens with multiple scenarios, they will naturally share the space.

**ScenarioCard.tsx changes:**
- Remove `sm:max-w-scenario` constraint
- Keep `w-full` for mobile
- Add a responsive flex basis for multi-card layouts

### 2. Fix KPI Banner with Responsive Grid

Replace the problematic dual-layout (hidden mobile grid + hidden desktop flex) with a single responsive grid that adapts to container width:

**ScenarioSummary.tsx changes:**
- Use `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` for automatic wrapping
- Remove the dividers (they don't work in grid layouts)
- Reduce font sizes to prevent overflow: `text-lg sm:text-xl lg:text-2xl`
- Remove the `hidden md:` / `md:hidden` pattern that causes the breakage

### 3. Update DealDetail Scenario Container

The parent container needs adjustment to allow cards to grow:

**DealDetail.tsx changes:**
- Change from horizontal scroll with fixed-width cards to a responsive grid
- Use `grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3` for scenarios
- This makes better use of screen real estate

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/scenarios/ScenarioCard.tsx` | Remove max-width constraint, allow card to grow |
| `src/components/scenarios/ScenarioSummary.tsx` | Replace flex layout with responsive grid, remove dividers |
| `src/pages/DealDetail.tsx` | Change scenarios from horizontal scroll to responsive grid |

---

## Visual Result

**Before:**
- Single 680px card floating in a 1400px container
- KPI text overlapping in the banner

**After:**
- Cards expand to fill available width (up to ~700px each in 2-column layout)
- On 1400px+ screens: 2 cards side by side
- On smaller screens: stacked full-width cards
- KPI values in a clean 2/3/4 column grid that wraps properly
