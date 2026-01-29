

# UI Theme Fixes: Refined Plan

## Overview
Apply targeted styling fixes to achieve the ROI Analysis visual theme. This plan covers typography, toggles, buttons, layout caps, and design tokens - styling changes only, no business logic modifications.

---

## Responsive Layout Strategy

### Validated Breakpoints
| Range | Behavior |
|-------|----------|
| 320-390px | Single column, stacked cards, horizontal scroll for tables within cards |
| 390-430px | Single column with slightly more breathing room |
| 768-1024px | Two-column grids where appropriate |
| 1280-1440px | Full layout, centered container |
| 1728-2560px+ | Centered container, scenario cards width-constrained |

### Container Rule (Single Consistent Rule)
All pages (Deals, Deal Detail, Auth) use the same container behavior:
- Maximum content width: 1400px
- Centered horizontally
- Responsive horizontal padding (smaller on mobile, larger on desktop)

### Scenario Card Width Constraints
- Minimum width: 440-480px (prevents cramped columns)
- Maximum width: ~680px (prevents stretched tables/text on ultrawide)
- Cards flex within this range based on available viewport space

---

## Design Tokens

### Light Theme Tokens
Update the existing shadcn-style tokens to match the new theme while retaining project conventions:

**Base colors:**
- Background: light blue wash (#E6F1FF equivalent)
- Foreground: deep navy (#0F2A56 equivalent)
- Card: white with navy foreground
- Muted foreground: muted navy for secondary text

**Primary accent:**
- Solid deep indigo for buttons and active toggle states (not gradient)

**Additional theme tokens to add:**
- `border`: navy at 10% opacity
- `divider`: navy at 8% opacity (for table row separators)
- `shadow-1`: primary card shadow (larger, subtle)
- `shadow-2`: secondary shadow (smaller, lighter)
- `grad-start`: purple-blue for KPI banner gradient start
- `grad-end`: deeper indigo for KPI banner gradient end
- `accent-soft`: soft lavender for highlight rows
- `focus`/`ring`: consistent focus state color mapping

**Scope:** Light theme only. The `.dark` block remains untouched.

---

## Typography

### Font Stack
Use Salesforce Sans with Inter and system fallbacks.

### Tabular Numbers
Apply `tabular-nums` intentionally to specific elements (no global selector hacks):
- KPI values in ScenarioSummary
- Currency-formatted values throughout the app
- Percentage values
- Numeric table columns/cells in ScenarioComparison
- Numeric inputs

### Type Scale
- Body text: 1rem (16px), medium weight, 1.45 line-height
- Secondary/muted text: 0.875rem (14px)
- Table headers: 0.8125rem (13px), bold, muted color
- Labels: 0.75rem (12px), semibold
- Page titles: modest clamp range (~30px to ~48px max)
- KPI numbers: modest clamp range (~32px to ~56px max), white on gradient

---

## Component Updates

### Card
- White background with subtle navy-tinted border
- 16px border radius
- Dual-layer soft shadow (shadow-1 + shadow-2)
- Consistent internal padding

### Button (Primary Variant)
- Solid accent color background (NOT gradient)
- White text
- 10px border radius
- Minimum 44px touch target on mobile/tablet

### Input
- 10px border radius
- Focus ring using the focus token color
- Clear focus state visibility

### DisplayModeToggle
- Pill-style outer container (fully rounded ends)
- Active segment: solid primary background, white text, also pill-shaped
- Inactive segment: transparent with navy text
- 150ms transition

### Tabs (TabsList / TabsTrigger)
- TabsList: pill-style container (fully rounded)
- Active TabsTrigger: solid primary background, white text, pill-shaped
- Match segmented toggle visual language

### ScenarioSummary (KPI Banner)
- Gradient background (grad-start to grad-end) - **gradient only here, nowhere else**
- 16px border radius
- Responsive padding
- Large white KPI numbers with tabular-nums
- Small white labels at reduced opacity
- Vertical dividers between KPI blocks on desktop (white at ~20% opacity)
- Mobile: reflow to grid layout

### ScenarioCard
- Width constraints: minimum 440-480px, maximum ~680px
- Flex within range based on available space
- Apply card styling (shadow, border, radius)
- Tabular-nums on any inline currency values

### ScenarioComparison (Tables)
- Table wrapped in card styling
- Header row: muted text, divider border below
- Body rows: separated by divider, subtle hover tint
- Highlight rows: accent-soft background with white text
- Summary rows: deeper accent background with white text
- Numeric columns: right-aligned, tabular-nums
- Horizontal scroll within card on narrow viewports

### LineItemRow / LineItemReadOnly
- Consistent card-like styling
- Left border accent for visual hierarchy
- Tabular-nums on price/quantity values

---

## Page-Level Updates

### All Pages (Deals, Deal Detail, Auth)
- Light blue background using background token
- Centered content container with 1400px max-width and responsive padding
- Consistent spacing and layout behavior across all three

### DealDetail Specific
- Scenario card area allows horizontal scroll when cards overflow
- Cards respect min/max width constraints

---

## Performance Constraints
- No custom font loading delays (system fonts load immediately)
- Minimal shadows (two-layer max)
- Transitions limited to 150-200ms
- No heavy blur effects

---

## Accessibility Requirements
- Touch targets minimum 44px on mobile/tablet
- Visible focus states on all interactive elements
- Color contrast maintained (navy on white, white on gradient)
- Browser zoom scales text naturally (rem/em-based sizing)

---

## Validation Checklist
- [ ] Tabular-nums applied to KPI values, currency, percentages, numeric table cells, numeric inputs
- [ ] DisplayModeToggle and Tabs use pill style (fully rounded container and active segments)
- [ ] Primary buttons use solid accent color (not gradient)
- [ ] Gradient only appears on KPI banner (ScenarioSummary)
- [ ] Scenario cards constrained between 440-480px min and ~680px max
- [ ] All pages use same container rule (1400px max, centered, responsive padding)
- [ ] Light blue background on all pages
- [ ] Tables horizontally scroll within cards on mobile
- [ ] All touch targets 44px+ on mobile
- [ ] Dark mode unchanged
- [ ] Design tokens properly defined (border, divider, shadows, grad-start/end, accent-soft, focus/ring)

---

## Files to Update

### Global Styling
- `src/index.css` - design tokens (light theme only), font stack
- `tailwind.config.ts` - extend with scenario card max-width, color mappings

### Base Components
- `src/components/ui/card.tsx` - shadow, border, radius
- `src/components/ui/button.tsx` - solid primary, radius
- `src/components/ui/input.tsx` - radius, focus ring
- `src/components/ui/tabs.tsx` - pill styling

### Scenario Components
- `src/components/scenarios/DisplayModeToggle.tsx` - pill style
- `src/components/scenarios/ScenarioSummary.tsx` - gradient KPI banner, tabular-nums
- `src/components/scenarios/ScenarioCard.tsx` - width constraints
- `src/components/scenarios/ScenarioComparison.tsx` - table styling, tabular-nums
- `src/components/scenarios/LineItemRow.tsx` - card styling, tabular-nums
- `src/components/scenarios/LineItemReadOnly.tsx` - card styling, tabular-nums

### Pages
- `src/pages/DealDetail.tsx` - background, container
- `src/pages/Deals.tsx` - background, container
- `src/pages/Auth.tsx` - background, container

